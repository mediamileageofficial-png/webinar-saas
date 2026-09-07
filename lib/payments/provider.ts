export interface CreateSessionInput {
  /** Our own stable order identifier, passed through to the provider as-is. */
  orderId: string;
  amount: number;
  currency: string;
  customer: {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
  };
  returnUrl: string;
  notifyUrl: string;
}

export interface CreateSessionResult {
  providerOrderId: string;
  paymentSessionId: string;
}

export type NormalizedPaymentStatus = "success" | "failed" | "cancelled" | "pending";

export interface WebhookEvent {
  providerOrderId: string;
  providerPaymentId?: string;
  status: NormalizedPaymentStatus;
  rawType?: string;
}

/**
 * Abstraction over a payment gateway, so Cashfree can be swapped for Razorpay
 * or another provider later without touching the registration/webhook logic
 * that depends on this interface.
 */
export interface PaymentProvider {
  createSession(input: CreateSessionInput): Promise<CreateSessionResult>;
  /** Verifies a webhook payload came from the provider, unmodified. Must use the RAW request body. */
  verifyWebhookSignature(rawBody: string, headers: Headers): boolean;
  parseWebhookEvent(rawBody: string): WebhookEvent;
}
