import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import type {
  PaymentProvider,
  CreateSessionInput,
  CreateSessionResult,
  WebhookEvent,
  NormalizedPaymentStatus,
} from "./provider";

// Cashfree Orders API - version pinned per their docs; bump deliberately, not
// silently, since request/response shapes differ across versions.
const CASHFREE_API_VERSION = "2023-08-01";

function baseUrl(isProduction: boolean): string {
  return isProduction ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
}

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export class CashfreeProvider implements PaymentProvider {
  private appId: string;
  private secretKey: string;
  private webhookSecret: string;
  private isProduction: boolean;

  /**
   * Accepts per-organization credentials (from organization_credentials,
   * fetched by the caller via lib/integrations/credentials.ts) with a
   * fallback to platform-level env vars. The env var fallback lets the
   * platform operate with shared/default credentials for tenants who
   * haven't configured their own yet - but a tenant's own configured
   * credentials always take priority when present. `env` ("sandbox" |
   * "production") travels WITH the credentials, since a tenant's own
   * Cashfree account has its own environment, independent of the platform's.
   */
  constructor(orgCredentials?: Record<string, string> | null) {
    this.appId = orgCredentials?.appId || process.env.CASHFREE_APP_ID || "";
    this.secretKey = orgCredentials?.secretKey || process.env.CASHFREE_SECRET_KEY || "";
    this.webhookSecret =
      orgCredentials?.webhookSecret || process.env.CASHFREE_WEBHOOK_SECRET || "";
    this.isProduction = (orgCredentials?.env ?? process.env.CASHFREE_ENV) === "production";
  }

  get environment(): "sandbox" | "production" {
    return this.isProduction ? "production" : "sandbox";
  }

  async createSession(input: CreateSessionInput): Promise<CreateSessionResult> {
    if (!this.appId || !this.secretKey) {
      throw new Error("Cashfree is not configured for this environment.");
    }

    const res = await fetch(`${baseUrl(this.isProduction)}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-version": CASHFREE_API_VERSION,
        "x-client-id": this.appId,
        "x-client-secret": this.secretKey,
      },
      body: JSON.stringify({
        order_id: input.orderId,
        order_amount: input.amount,
        order_currency: input.currency,
        customer_details: {
          customer_id: input.customer.id,
          customer_name: input.customer.name || undefined,
          customer_email: input.customer.email || undefined,
          // Cashfree requires a phone number on every order; fall back to a
          // placeholder rather than failing order creation for forms that
          // don't collect one.
          customer_phone: input.customer.phone || "9999999999",
        },
        order_meta: {
          return_url: input.returnUrl,
          notify_url: input.notifyUrl,
        },
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.payment_session_id || !data?.order_id) {
      throw new Error(data?.message || "Cashfree order creation failed.");
    }

    return {
      providerOrderId: data.order_id,
      paymentSessionId: data.payment_session_id,
    };
  }

  /**
   * Per Cashfree's documented scheme: signatureData = timestamp + rawBody,
   * HMAC-SHA256 with the webhook secret, base64-encoded, compared against
   * the x-webhook-signature header. MUST use the raw, unparsed request body -
   * re-serializing JSON can change decimal formatting and break the match.
   */
  verifyWebhookSignature(rawBody: string, headers: Headers): boolean {
    if (!this.webhookSecret) return false;

    const signature = headers.get("x-webhook-signature");
    const timestamp = headers.get("x-webhook-timestamp");
    if (!signature || !timestamp) return false;

    const expected = createHmac("sha256", this.webhookSecret)
      .update(timestamp + rawBody)
      .digest("base64");

    try {
      return safeCompare(expected, signature);
    } catch {
      // Buffer length mismatch etc. - treat as invalid, never throw here.
      return false;
    }
  }

  parseWebhookEvent(rawBody: string): WebhookEvent {
    const payload = JSON.parse(rawBody);
    const orderId: string | undefined = payload?.data?.order?.order_id;
    const rawPaymentId = payload?.data?.payment?.cf_payment_id;
    const rawStatus: string | undefined = payload?.data?.payment?.payment_status;

    if (!orderId) {
      throw new Error("Webhook payload missing order id.");
    }

    let status: NormalizedPaymentStatus = "pending";
    switch (rawStatus) {
      case "SUCCESS":
        status = "success";
        break;
      case "FAILED":
        status = "failed";
        break;
      case "USER_DROPPED":
      case "CANCELLED":
        status = "cancelled";
        break;
      // NOT_ATTEMPTED, PENDING, and anything unrecognized stay "pending" -
      // per Cashfree's own idempotency guidance, only SUCCESS is terminal.
      default:
        status = "pending";
    }

    return {
      providerOrderId: orderId,
      providerPaymentId: rawPaymentId !== undefined ? String(rawPaymentId) : undefined,
      status,
      rawType: payload?.type,
    };
  }
}
