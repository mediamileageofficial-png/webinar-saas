import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { CashfreeProvider } from "@/lib/payments/cashfree";
import { getOrgCredentials } from "@/lib/integrations/credentials";
import { isRateLimited, getClientIp, hashIp } from "@/lib/public-form/security";

interface CreatePaymentBody {
  registrationId?: string;
}

export async function POST(req: Request) {
  let body: CreatePaymentBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const registrationId = body.registrationId;
  if (!registrationId) {
    return NextResponse.json({ error: "registrationId is required" }, { status: 400 });
  }

  // Found during final QA: this endpoint had no rate limiting at all, unlike
  // its sibling /api/public/forms/[id]/submit - a repeated call with the
  // same registrationId (while payment_status stays non-'success') would
  // create an unbounded number of Cashfree orders/payment rows with no
  // throttling. Same limiter, same key shape as the submit endpoint.
  const ip = getClientIp(req.headers);
  if (isRateLimited(`payments-create:${hashIp(ip)}:${registrationId}`)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a minute." },
      { status: 429 }
    );
  }

  try {
    const supabase = createAdminClient();

    // Amount and currency come ONLY from the form/registration records looked
    // up server-side - never from the client, which could otherwise request
    // an arbitrary (e.g. near-zero) payment amount.
    const { data: registration, error: regError } = await supabase
      .from("registrations")
      .select("id, organization_id, form_id, full_name, email, mobile, payment_status")
      .eq("id", registrationId)
      .maybeSingle();

    if (regError || !registration) {
      return NextResponse.json({ error: "Registration not found." }, { status: 404 });
    }
    if (registration.payment_status === "success") {
      return NextResponse.json({ error: "This registration is already paid." }, { status: 409 });
    }

    const { data: form, error: formError } = await supabase
      .from("forms")
      .select("id, organization_id, is_paid, price_amount, currency")
      .eq("id", registration.form_id)
      .eq("organization_id", registration.organization_id)
      .maybeSingle();

    if (formError || !form || !form.is_paid || !form.price_amount) {
      return NextResponse.json({ error: "This form does not require payment." }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    // A fresh order id per attempt - a person can retry payment after a
    // failure/drop and each attempt gets its own Cashfree order.
    const orderId = `reg_${registration.id.replace(/-/g, "")}_${Date.now()}`;

    const provider = new CashfreeProvider(await getOrgCredentials(registration.organization_id, "cashfree"));
    const session = await provider.createSession({
      orderId,
      amount: Number(form.price_amount),
      currency: form.currency,
      customer: {
        id: registration.id,
        name: registration.full_name || undefined,
        email: registration.email || undefined,
        phone: registration.mobile || undefined,
      },
      returnUrl: `${appUrl}/pay/${registration.id}/return?order_id={order_id}`,
      notifyUrl: `${appUrl}/api/webhooks/cashfree`,
    });

    const { error: insertError } = await supabase.from("payments").insert({
      organization_id: registration.organization_id,
      registration_id: registration.id,
      provider: "cashfree",
      provider_order_id: session.providerOrderId,
      amount: form.price_amount,
      currency: form.currency,
      status: "pending",
      idempotency_key: randomUUID(),
    });

    if (insertError) {
      return NextResponse.json(
        { error: "Could not record the payment attempt." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      paymentSessionId: session.paymentSessionId,
      orderId: session.providerOrderId,
      cashfreeEnv: provider.environment,
    });
  } catch (err) {
    // Log the real cause server-side; never leak it (e.g. "Cashfree is not
    // configured", a raw gateway error message) to a public caller.
    console.error("[payments/create]", err);
    return NextResponse.json(
      { error: "Could not start payment right now. Please try again shortly." },
      { status: 500 }
    );
  }
}
