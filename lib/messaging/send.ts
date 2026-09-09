import { createAdminClient } from "@/lib/supabase/admin";
import { renderTemplate, extractVariableNames } from "@/lib/templates/render";
import { Msg91SmsProvider, Msg91WhatsAppProvider } from "./msg91";
import { getEmailProvider } from "./email";
import { getOrgCredentials } from "@/lib/integrations/credentials";

export interface SendTemplatedMessageInput {
  organizationId: string;
  registrationId: string;
  templateKey: string;
  channel: "sms" | "whatsapp" | "email";
  recipient: string;
  variables: Record<string, string | number | undefined>;
  /** Distinguishes repeat sends of the same template (e.g. multiple reminder offsets) that should NOT be deduped against each other. */
  dedupeSuffix?: string;
}

/**
 * Sends a templated message and always logs the attempt. This function is
 * designed to NEVER throw - per the plan's explicit rule, a messaging
 * provider failure must never block or fail the registration/payment flow
 * that triggered it. Callers should `await` it (so the log row exists before
 * the response returns) without wrapping it in their own try/catch.
 */
export async function sendTemplatedMessage(input: SendTemplatedMessageInput): Promise<void> {
  const supabase = createAdminClient();

  const dedupeKey = `${input.registrationId}:${input.templateKey}:${input.channel}${
    input.dedupeSuffix ? `:${input.dedupeSuffix}` : ""
  }`;

  // Reserve the log row FIRST, before rendering or calling any provider. If
  // two callers race (e.g. a duplicate webhook delivery both trying to send
  // "payment_confirmation"), the second insert collides on the unique
  // dedupe_key and is treated as already-handled - this is what actually
  // prevents a duplicate send, not anything in the provider call itself.
  const { data: logRow, error: reserveError } = await supabase
    .from("message_logs")
    .insert({
      organization_id: input.organizationId,
      registration_id: input.registrationId,
      channel: input.channel,
      template_key: input.templateKey,
      recipient: input.recipient,
      status: "queued",
      dedupe_key: dedupeKey,
    })
    .select("id")
    .single();

  if (reserveError) {
    if (reserveError.message.includes("duplicate key")) {
      return; // Already sent (or in flight) - correct, silent no-op.
    }
    console.error("[sendTemplatedMessage] could not reserve log row", reserveError);
    return; // Never throw - see function doc comment.
  }

  try {
    const { data: template, error: templateError } = await supabase
      .from("message_templates")
      .select("body, subject, provider_template_id, provider_variable_order")
      .eq("organization_id", input.organizationId)
      .eq("key", input.templateKey)
      .eq("channel", input.channel)
      .eq("is_active", true)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (templateError || !template) {
      await markFailed(supabase, logRow.id, "No active template configured for this key/channel.");
      return;
    }

    let providerMessageId: string;

    if (input.channel === "email") {
      const html = renderTemplate(template.body, input.variables, { escapeHtml: true });
      const subject = renderTemplate(template.subject ?? "", input.variables);
      const [emailCredentials, msg91Credentials] = await Promise.all([
        getOrgCredentials(input.organizationId, "email"),
        getOrgCredentials(input.organizationId, "msg91"),
      ]);
      const provider = getEmailProvider(emailCredentials, msg91Credentials);
      // MSG91's email API renders its own template from named variables;
      // Resend ignores templateId/variables and just sends `html`.
      const stringVars: Record<string, string> = {};
      for (const [k, v] of Object.entries(input.variables)) {
        stringVars[k] = String(v ?? "");
      }
      const result = await provider.sendEmail({
        to: input.recipient,
        subject,
        html,
        templateId: template.provider_template_id,
        variables: stringVars,
      });
      providerMessageId = result.providerMessageId;
    } else if (input.channel === "sms") {
      if (!template.provider_template_id) {
        await markFailed(supabase, logRow.id, "Template has no MSG91 template id configured.");
        return;
      }
      const order =
        (template.provider_variable_order as string[] | null) ?? extractVariableNames(template.body);
      const values = order.map((key) => String(input.variables[key] ?? ""));
      const credentials = await getOrgCredentials(input.organizationId, "msg91");
      const provider = new Msg91SmsProvider(credentials);
      const result = await provider.send({
        to: input.recipient,
        providerTemplateId: template.provider_template_id,
        orderedVariableValues: values,
      });
      providerMessageId = result.providerMessageId;
    } else {
      if (!template.provider_template_id) {
        await markFailed(supabase, logRow.id, "Template has no WhatsApp template name configured.");
        return;
      }
      const order =
        (template.provider_variable_order as string[] | null) ?? extractVariableNames(template.body);
      const values = order.map((key) => String(input.variables[key] ?? ""));
      const credentials = await getOrgCredentials(input.organizationId, "msg91");
      const provider = new Msg91WhatsAppProvider(credentials);
      const result = await provider.send({
        to: input.recipient,
        providerTemplateName: template.provider_template_id,
        languageCode: "en",
        orderedVariableValues: values,
      });
      providerMessageId = result.providerMessageId;
    }

    await supabase
      .from("message_logs")
      .update({
        status: "sent",
        provider_message_id: providerMessageId,
        sent_at: new Date().toISOString(),
      })
      .eq("id", logRow.id);
  } catch (err) {
    await markFailed(supabase, logRow.id, err instanceof Error ? err.message : "Unknown error");
  }
}

async function markFailed(
  supabase: ReturnType<typeof createAdminClient>,
  logId: string,
  reason: string
) {
  await supabase
    .from("message_logs")
    .update({ status: "failed", failure_reason: reason })
    .eq("id", logId);
}
