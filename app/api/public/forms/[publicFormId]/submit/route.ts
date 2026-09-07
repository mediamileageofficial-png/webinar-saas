import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateSubmission } from "@/lib/public-form/validate";
import { computeDedupeKey } from "@/lib/public-form/dedupe";
import { isRateLimited, getClientIp, hashIp } from "@/lib/public-form/security";
import { sendTemplatedMessage } from "@/lib/messaging/send";
import { buildRegistrationVariables } from "@/lib/messaging/build-registration-variables";
import type { RenderableField } from "@/components/public-form/field-preview";

interface SubmitBody {
  values?: Record<string, unknown>;
  utm?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_content?: string;
    utm_term?: string;
  };
  referrer?: string;
  landingPage?: string;
  /** Honeypot - real visitors never see or fill this field. */
  website?: string;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ publicFormId: string }> }
) {
  const { publicFormId } = await params;

  const ip = getClientIp(req.headers);
  const ipHash = hashIp(ip);
  if (isRateLimited(`${publicFormId}:${ipHash}`)) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again in a minute." },
      { status: 429 }
    );
  }

  let body: SubmitBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Honeypot: a hidden field real users never fill in. Bots that fill every
  // input trip this. Return a success-shaped response without persisting
  // anything, so the bot gets no signal that it was caught.
  if (body.website) {
    return NextResponse.json({ ok: true, status: "confirmed" });
  }

  try {
    const supabase = createAdminClient();

    // Never trust organization_id/webinar_id from the client - both are
    // derived here from the form row itself, looked up by its public slug.
    const { data: form, error: formError } = await supabase
      .from("forms")
      .select(
        "id, organization_id, webinar_id, is_paid, price_amount, currency, success_message, redirect_url"
      )
      .eq("public_slug", publicFormId)
      .eq("is_published", true)
      .maybeSingle();

    if (formError || !form) {
      return NextResponse.json(
        { error: "This form is not accepting submissions." },
        { status: 404 }
      );
    }

    const { data: fieldsRaw } = await supabase
      .from("form_fields")
      .select("id, field_type, field_key, label, placeholder, help_text, is_required, options")
      .eq("form_id", form.id)
      .eq("is_active", true);

    const fields = (fieldsRaw ?? []) as RenderableField[];

    const { errors, values } = validateSubmission(fields, body.values ?? {});
    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        { error: "Please fix the highlighted fields.", fieldErrors: errors },
        { status: 422 }
      );
    }

    // Map semantic field TYPES (not arbitrary key names a tenant chose) onto
    // the core registration columns, so a tenant can rename their "Email"
    // field's key to anything and this still works.
    const emailField = fields.find((f) => f.field_type === "email");
    const mobileField = fields.find((f) => f.field_type === "mobile");
    const nameField =
      fields.find((f) => f.field_type === "full_name") ??
      fields.find((f) => f.field_type === "first_name");
    const lastNameField = fields.find((f) => f.field_type === "last_name");

    const email = emailField ? values[emailField.field_key] : undefined;
    const mobile = mobileField ? values[mobileField.field_key] : undefined;
    const fullName = nameField
      ? [values[nameField.field_key], lastNameField ? values[lastNameField.field_key] : undefined]
          .filter(Boolean)
          .join(" ")
      : undefined;

    const dedupeKey = computeDedupeKey({ email, mobile });

    const isPaid = form.is_paid;
    // Per the plan's registration state machine: free forms go straight to
    // confirmed; paid forms sit in pending until Phase 7 wires real payment
    // verification. This must NEVER say "confirmed" for a paid form before
    // that verification exists.
    const initialStatus = isPaid ? "pending" : "confirmed";
    const initialPaymentStatus = isPaid ? "pending" : "not_applicable";

    const { data: registration, error: insertError } = await supabase
      .from("registrations")
      .insert({
        organization_id: form.organization_id,
        form_id: form.id,
        webinar_id: form.webinar_id,
        full_name: fullName || null,
        email: email || null,
        mobile: mobile || null,
        status: initialStatus,
        payment_status: initialPaymentStatus,
        utm_source: body.utm?.utm_source || null,
        utm_medium: body.utm?.utm_medium || null,
        utm_campaign: body.utm?.utm_campaign || null,
        utm_content: body.utm?.utm_content || null,
        utm_term: body.utm?.utm_term || null,
        referrer: body.referrer || null,
        landing_page: body.landingPage || null,
        ip_hash: ipHash,
        dedupe_key: dedupeKey,
      })
      .select("id, status")
      .single();

    if (insertError) {
      if (insertError.message.includes("duplicate key")) {
        // Someone already submitted with this email/mobile for this form.
        // Look up their existing registration and return ITS status rather
        // than erroring or silently creating a second row. If they're a
        // paid-form registrant who never finished paying, let them resume
        // rather than dead-ending on "you've already registered".
        const { data: existing } = await supabase
          .from("registrations")
          .select("id, status, payment_status")
          .eq("form_id", form.id)
          .eq("dedupe_key", dedupeKey)
          .maybeSingle();

        const stillNeedsPayment = isPaid && existing?.payment_status !== "success";

        return NextResponse.json({
          ok: true,
          duplicate: true,
          status: existing?.status ?? "confirmed",
          registrationId: existing?.id,
          requiresPayment: stillNeedsPayment,
          message: stillNeedsPayment
            ? "You've already started registering - let's finish your payment."
            : "You've already registered for this form.",
        });
      }
      return NextResponse.json(
        { error: "Could not submit your registration. Please try again." },
        { status: 500 }
      );
    }

    // Persist every submitted value (not just the ones mapped to core
    // columns) so custom fields aren't lost.
    const fieldIdByKey = new Map(fields.map((f) => [f.field_key, f.id]));
    const valueRows = Object.entries(values)
      .filter(([key, value]) => fieldIdByKey.has(key) && value !== "")
      .map(([key, value]) => ({
        organization_id: form.organization_id,
        registration_id: registration.id,
        field_id: fieldIdByKey.get(key)!,
        value,
      }));

    if (valueRows.length > 0) {
      // Not fatal if this partially fails - the registration itself already
      // succeeded, which matters most for the person registering.
      await supabase.from("registration_values").insert(valueRows);
    }

    // TODO (Phase 9): the full automation engine (reminders, follow-ups) will
    // subscribe to this "registration_created" event via automation_rules.
    // For now, a free/confirmed registration's confirmation message is sent
    // directly here. sendTemplatedMessage is designed to NEVER throw and
    // ALWAYS log the attempt - a messaging provider outage must never fail
    // this response, per the plan's explicit rule.
    if (!isPaid) {
      const built = await buildRegistrationVariables(supabase, registration.id);
      if (built) {
        if (built.registration.email) {
          await sendTemplatedMessage({
            organizationId: form.organization_id,
            registrationId: registration.id,
            templateKey: "registration_confirmation",
            channel: "email",
            recipient: built.registration.email,
            variables: built.variables,
          });
        }
        if (built.registration.mobile) {
          await sendTemplatedMessage({
            organizationId: form.organization_id,
            registrationId: registration.id,
            templateKey: "registration_confirmation",
            channel: "sms",
            recipient: built.registration.mobile,
            variables: built.variables,
          });
        }
      }
    }

    return NextResponse.json({
      ok: true,
      status: registration.status,
      registrationId: registration.id,
      requiresPayment: isPaid,
      successMessage: form.success_message,
      redirectUrl: form.redirect_url,
    });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
