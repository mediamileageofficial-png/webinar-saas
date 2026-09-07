import "server-only";
import type { EmailProvider, SendResult } from "./provider";

/**
 * Default EmailProvider implementation using Resend's HTTP API. Swappable
 * for Postmark/SES/etc. later - nothing outside this file knows it's Resend.
 */
export class ResendEmailProvider implements EmailProvider {
  private apiKey: string;
  private fromAddress: string;

  constructor(orgCredentials?: Record<string, string> | null) {
    this.apiKey = orgCredentials?.apiKey || process.env.EMAIL_PROVIDER_API_KEY || "";
    this.fromAddress = orgCredentials?.fromAddress || process.env.EMAIL_FROM_ADDRESS || "";
  }

  async sendEmail(input: { to: string; subject: string; html: string }): Promise<SendResult> {
    if (!this.apiKey || !this.fromAddress) {
      throw new Error("Email provider is not configured for this environment.");
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.fromAddress,
        to: input.to,
        subject: input.subject,
        html: input.html,
      }),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.id) {
      throw new Error(data?.message || "Email send failed.");
    }

    return { providerMessageId: data.id };
  }

  async verifyConfiguration(): Promise<boolean> {
    return Boolean(this.apiKey && this.fromAddress);
  }
}
