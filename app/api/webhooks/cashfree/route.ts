import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CashfreeProvider } from "@/lib/payments/cashfree";
import { sendTemplatedMessage } from "@/lib/messaging/send";
import { buildRegistrationVariables } from "@/lib/messaging/build-registration-variables";
import { getOrgCredentials } from "@/lib/integrations/credentials";

/**
 * Reads ONLY the order id out of the raw payload, without trusting anything
 * else in it. This is safe to do before signature verification because we
 * never ACT on this value - we only use it to look up which organization's
 * existing payment record it belongs to, purely so we know whose webhook
 * secret to verify the signature against (see the chicken-and-egg problem
 * documented in the POST handler below).
 */
function extractUnverifiedOrderId(rawBody: string): string | null {
  try {
    const payload = JSON.parse(rawBody);
    const orderId = payload?.data?.order?.order_id;
    return typeof orderId === "string" ? orderId : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  // CRITICAL: read the raw body text BEFORE any JSON parsing. Cashfree signs
  // the exact bytes it sent; re-serializing a parsed object (which can
  // reformat numbers, e.g. 170.00 -> 170) breaks signature verification.
  const rawBody = await req.text();

  try {
    // Per-org credentials create a genuine ordering problem: verifying the
    // signature needs the RIGHT organization's webhook secret, but we only
    // learn which organization a webhook belongs to from the payload itself -
    // which we can't trust until AFTER verification. The safe resolution:
    // look up the order id (untrusted, not acted upon) against our own
    // `payments` table to find the organization, fetch THAT org's secret, and
    // verify against it. If an attacker fabricates an order id, the lookup
    // either finds nothing (rejected below) or finds a real payment belonging
    // to some real org - and the attacker would need THAT org's actual secret
    // to pass verification, which they don't have. Nothing from the payload is
    // acted on until this verification succeeds.
    const unverifiedOrderId = extractUnverifiedOrderId(rawBody);
    if (!unverifiedOrderId) {
      return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: payment, error: paymentLookupError } = await supabase
      .from("payments")
      .select("id, organization_id, registration_id, status")
      .eq("provider", "cashfree")
      .eq("provider_order_id", unverifiedOrderId)
      .maybeSingle();

    if (paymentLookupError || !payment) {
      // Unknown order (stale test webhook, or an order we never created).
      // Acknowledge with 200 so Cashfree doesn't retry forever, but do
      // nothing else - notably, we have NOT verified any signature yet, so we
      // must not treat this as a legitimate event either way.
      return NextResponse.json({ ok: true, note: "Unknown order, ignored." });
    }

    const credentials = await getOrgCredentials(payment.organization_id, "cashfree");
    const provider = new CashfreeProvider(credentials);

    let signatureValid = false;
    try {
      signatureValid = provider.verifyWebhookSignature(rawBody, req.headers);
    } catch {
      signatureValid = false;
    }

    if (!signatureValid) {
      // This check is the entire trust boundary for "was this payment actually
      // verified by Cashfree" - per the plan, we never mark a payment
      // successful based on anything else (frontend redirect, query params).
      // Reject outright; nothing from the payload has been acted on.
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    let event;
    try {
      event = provider.parseWebhookEvent(rawBody);
    } catch {
      return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
    }

    // Idempotency per Cashfree's own documented guidance: SUCCESS is the
    // only terminal confirmation. Once a payment is already 'success', every
    // further webhook for it (retries, out-of-order delivery, a later
    // FAILED from a since-abandoned duplicate attempt) is ignored outright -
    // a confirmed registration must never be downgraded by a late webhook.
    if (payment.status === "success") {
      return NextResponse.json({ ok: true, note: "Already processed." });
    }

    const { error: updateError } = await supabase
      .from("payments")
      .update({
        status: event.status,
        provider_payment_id: event.providerPaymentId ?? null,
        raw_webhook_payload: JSON.parse(rawBody),
      })
      .eq("id", payment.id);

    if (updateError) {
      return NextResponse.json({ error: "Could not record payment update." }, { status: 500 });
    }

    if (event.status === "success") {
      // This is the ONLY place in the codebase that sets a paid
      // registration's status to 'confirmed' - never on submit, never from
      // a client-side redirect.
      await supabase
        .from("registrations")
        .update({ status: "confirmed", payment_status: "success" })
        .eq("id", payment.registration_id)
        .eq("organization_id", payment.organization_id);

      // As in the submit route: sendTemplatedMessage never throws and always
      // logs the attempt, so a messaging outage can't turn this into a
      // failed webhook response (which would make Cashfree retry needlessly).
      const built = await buildRegistrationVariables(supabase, payment.registration_id);
      if (built) {
        const { data: paymentRow } = await supabase
          .from("payments")
          .select("amount, currency")
          .eq("id", payment.id)
          .maybeSingle();
        const variables = {
          ...built.variables,
          amount: paymentRow ? `${paymentRow.currency} ${paymentRow.amount}` : "",
        };

        if (built.registration.email) {
          await sendTemplatedMessage({
            organizationId: payment.organization_id,
            registrationId: payment.registration_id,
            templateKey: "payment_confirmation",
            channel: "email",
            recipient: built.registration.email,
            variables,
          });
        }
      }
      // TODO (Phase 9): fire the broader "payment_success" automation
      // trigger here for any additional org-configured rules.
    } else if (event.status === "failed" || event.status === "cancelled") {
      await supabase
        .from("registrations")
        .update({ payment_status: event.status })
        .eq("id", payment.registration_id)
        .eq("organization_id", payment.organization_id);
      // Registration itself stays 'pending' so the person can retry payment
      // via /pay/[registrationId] without resubmitting the whole form.
    }
    // "pending" events (NOT_ATTEMPTED etc.) are transitional - no DB write.

    return NextResponse.json({ ok: true });
  } catch (err) {
    // This top-level catch is deliberately wide: it covers EVERYTHING after
    // reading the raw body, including createAdminClient() (which throws
    // synchronously if Supabase env vars are missing) and any network
    // failure talking to Supabase - not just the later processing steps.
    // A webhook endpoint must never produce a raw, unhandled 500 to a public
    // caller; found via a route-by-route QA sweep, not assumed safe because
    // "most of the function" already had a try/catch.
    console.error("[webhooks/cashfree]", err);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
