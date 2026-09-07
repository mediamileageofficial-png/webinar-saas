import "server-only";
import type { SmsProvider, WhatsAppProvider, SendResult } from "./provider";

const MSG91_BASE = "https://api.msg91.com/api";

/**
 * MSG91 SMS via the Flow (template) API. India's DLT regulation requires
 * every transactional SMS to use a pre-approved template - this is why
 * `send()` takes a provider template id and POSITIONAL variable values
 * (VAR1, VAR2, ...) rather than a free-text message body.
 */
export class Msg91SmsProvider implements SmsProvider {
  private authKey: string;
  private senderId: string;

  constructor(orgCredentials?: Record<string, string> | null) {
    this.authKey = orgCredentials?.authKey || process.env.MSG91_AUTH_KEY || "";
    this.senderId = orgCredentials?.senderId || process.env.MSG91_SENDER_ID || "";
  }

  async send(input: {
    to: string;
    providerTemplateId: string;
    orderedVariableValues: string[];
  }): Promise<SendResult> {
    if (!this.authKey || !this.senderId) {
      throw new Error("MSG91 is not configured for this environment.");
    }

    const variables: Record<string, string> = {};
    input.orderedVariableValues.forEach((value, i) => {
      variables[`VAR${i + 1}`] = value;
    });

    const res = await fetch(`${MSG91_BASE}/v5/flow/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authkey: this.authKey,
      },
      body: JSON.stringify({
        template_id: input.providerTemplateId,
        sender: this.senderId,
        recipients: [{ mobiles: input.to, ...variables }],
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || data?.type === "error") {
      throw new Error(data?.message || "MSG91 SMS send failed.");
    }

    return { providerMessageId: String(data?.request_id ?? data?.message ?? "unknown") };
  }
}

/**
 * MSG91 WhatsApp Business API. Like SMS, WhatsApp requires a pre-approved
 * (Meta-reviewed) template - the shape below matches MSG91's documented
 * template outbound endpoint. NOTE: unverified against a live account in
 * this environment (no network access to msg91.com from this sandbox);
 * built from current MSG91 docs, please confirm with one real send.
 */
export class Msg91WhatsAppProvider implements WhatsAppProvider {
  private authKey: string;
  private integratedNumber: string;

  constructor(orgCredentials?: Record<string, string> | null) {
    this.authKey = orgCredentials?.authKey || process.env.MSG91_AUTH_KEY || "";
    this.integratedNumber =
      orgCredentials?.integratedNumber || process.env.MSG91_WHATSAPP_INTEGRATED_NUMBER || "";
  }

  async send(input: {
    to: string;
    providerTemplateName: string;
    languageCode: string;
    orderedVariableValues: string[];
  }): Promise<SendResult> {
    if (!this.authKey || !this.integratedNumber) {
      throw new Error("MSG91 WhatsApp is not configured for this environment.");
    }

    const bodyComponents: Record<string, { type: "text"; value: string }> = {};
    input.orderedVariableValues.forEach((value, i) => {
      bodyComponents[`body_${i + 1}`] = { type: "text", value };
    });

    const res = await fetch(`${MSG91_BASE}/v5/whatsapp/whatsapp-outbound-message/bulk/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authkey: this.authKey,
      },
      body: JSON.stringify({
        integrated_number: this.integratedNumber,
        content_type: "template",
        payload: {
          messaging_product: "whatsapp",
          type: "template",
          template: {
            name: input.providerTemplateName,
            language: { code: input.languageCode, policy: "deterministic" },
            to_and_components: [{ to: [input.to], components: bodyComponents }],
          },
        },
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.message || "MSG91 WhatsApp send failed.");
    }

    return { providerMessageId: String(data?.request_id ?? data?.message_id ?? "unknown") };
  }
}
