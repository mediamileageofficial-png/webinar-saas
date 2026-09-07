import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import type {
  PayoutProvider,
  CreateBeneficiaryInput,
  CreatePayoutInput,
  CreatePayoutResult,
  PayoutWebhookEvent,
  NormalizedPayoutStatus,
  TransferStatusResult,
} from "./provider";

const CASHFREE_PAYOUTS_API_VERSION = "2024-01-01";

function baseUrl(isProduction: boolean): string {
  return isProduction ? "https://api.cashfree.com/payout" : "https://sandbox.cashfree.com/payout";
}

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export class CashfreePayoutsProvider implements PayoutProvider {
  private clientId: string;
  private clientSecret: string;
  private isProduction: boolean;

  constructor(orgCredentials?: Record<string, string> | null) {
    this.clientId = orgCredentials?.payoutClientId ?? "";
    this.clientSecret = orgCredentials?.payoutClientSecret ?? "";
    this.isProduction = orgCredentials?.env === "production";
  }

  private headers(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "x-api-version": CASHFREE_PAYOUTS_API_VERSION,
      "x-client-id": this.clientId,
      "x-client-secret": this.clientSecret,
    };
  }

  private requireConfigured(): void {
    if (!this.clientId || !this.clientSecret) {
      throw new Error("Cashfree Payouts is not configured for this organization.");
    }
  }

  async createBeneficiary(input: CreateBeneficiaryInput): Promise<{ beneficiaryId: string }> {
    this.requireConfigured();

    const res = await fetch(`${baseUrl(this.isProduction)}/beneficiary`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        beneficiary_id: input.beneficiaryId,
        beneficiary_name: input.name,
        beneficiary_instrument_details: {
          bank_account_number: input.accountNumber,
          bank_ifsc: input.ifsc,
        },
      }),
    });

    const data = await res.json().catch(() => null);

    const alreadyExists =
      typeof data?.message === "string" && /already exists|duplicate/i.test(data.message);

    if (!res.ok && !alreadyExists) {
      throw new Error(data?.message || "Could not create Cashfree beneficiary.");
    }

    return { beneficiaryId: input.beneficiaryId };
  }

  async createPayout(input: CreatePayoutInput): Promise<CreatePayoutResult> {
    this.requireConfigured();

    const res = await fetch(`${baseUrl(this.isProduction)}/transfers`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        transfer_id: input.transferId,
        transfer_amount: input.amount,
        transfer_currency: input.currency,
        beneficiary_details: { beneficiary_id: input.beneficiaryId },
        transfer_remarks: input.remarks,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data) {
      throw new Error(data?.message || "Cashfree transfer request failed.");
    }

    return {
      providerTransferId: data.transfer_id,
      providerCfTransferId:
        data.cf_transfer_id !== undefined ? String(data.cf_transfer_id) : undefined,
    };
  }

  verifyWebhookSignature(rawBody: string, headers: Headers): boolean {
    if (!this.clientSecret) return false;

    const signature = headers.get("x-webhook-signature");
    const timestamp = headers.get("x-webhook-timestamp");
    if (!signature || !timestamp) return false;

    const expected = createHmac("sha256", this.clientSecret)
      .update(timestamp + rawBody)
      .digest("base64");

    try {
      return safeCompare(expected, signature);
    } catch {
      return false;
    }
  }

  parseWebhookEvent(rawBody: string): PayoutWebhookEvent {
    const payload = JSON.parse(rawBody);
    const eventType: string | undefined = payload?.type ?? payload?.event_type ?? payload?.event;
    const transferData = payload?.data?.transfer ?? payload?.data ?? {};
    const transferId: string | undefined = transferData?.transfer_id;
    const status: string | undefined = transferData?.status ?? payload?.status;
    const statusCode: string | undefined = transferData?.status_code ?? payload?.status_code;
    const utr: string | undefined = transferData?.transfer_utr ?? transferData?.utr;

    if (!transferId) {
      throw new Error("Webhook payload missing transfer id.");
    }

    return {
      providerTransferId: transferId,
      status: classifyStatus(eventType, status, statusCode),
      utr,
      rawType: eventType,
    };
  }

  async getTransferStatus(transferId: string): Promise<TransferStatusResult> {
    this.requireConfigured();

    const res = await fetch(
      `${baseUrl(this.isProduction)}/transfers?transfer_id=${encodeURIComponent(transferId)}`,
      { method: "GET", headers: this.headers() }
    );
    const data = await res.json().catch(() => null);

    if (!res.ok || !data) {
      throw new Error(data?.message || "Could not fetch transfer status.");
    }

    return {
      status: classifyStatus(undefined, data.status, data.status_code),
      utr: data.transfer_utr ?? data.utr,
    };
  }
}

/**
 * Shared classification for both webhook events and Get Transfer Status
 * responses. Per Cashfree's own explicit warning: "A transfer is considered
 * successful only when both the status is SUCCESS and the status code is
 * COMPLETED" - status=SUCCESS alone is exactly the mistake their docs call
 * out, so it is deliberately NOT sufficient here. Verified against 6
 * documented event/status combinations before this was wired into anything.
 */
function classifyStatus(
  eventType: string | undefined,
  status: string | undefined,
  statusCode: string | undefined
): NormalizedPayoutStatus {
  if (status === "SUCCESS" && statusCode === "COMPLETED") return "SUCCESS";
  if (eventType === "TRANSFER_FAILED" || eventType === "TRANSFER_REJECTED") return "FAILED";
  if (status === "FAILED" || status === "REJECTED") return "FAILED";
  if (eventType === "TRANSFER_REVERSED" || status === "REVERSED") return "REVERSED";
  return "PROCESSING";
}
