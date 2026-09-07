export interface BankAccountDetails {
  accountNumber: string;
  ifsc: string;
  accountHolderName: string;
}

export type BankVerificationStatus = "VERIFIED" | "NAME_MISMATCH" | "FAILED";

export interface BankVerificationResult {
  providerReferenceId?: string;
  status: BankVerificationStatus;
  matchedName?: string;
  nameMatchResult?: string;
  nameMatchScore?: number;
  bankName?: string;
  failureReason?: string;
  rawResponse: unknown;
}

/**
 * Abstraction over a bank-account verification provider, so Cashfree can be
 * replaced later without rewriting the payout eligibility logic that
 * depends on this interface (same pattern as PaymentProvider/SmsProvider).
 */
export interface BankVerificationProvider {
  verifyBankAccount(details: BankAccountDetails): Promise<BankVerificationResult>;
}

// ============================================================================
// Payout transfer types (Phase 20)
// ============================================================================

export interface CreateBeneficiaryInput {
  beneficiaryId: string;
  name: string;
  accountNumber: string;
  ifsc: string;
}

export interface CreatePayoutInput {
  /** Our own stable transfer id, passed through to the provider as-is - this IS the idempotency key. */
  transferId: string;
  amount: number;
  currency: string;
  beneficiaryId: string;
  remarks?: string;
}

export interface CreatePayoutResult {
  providerTransferId: string;
  providerCfTransferId?: string;
}

export type NormalizedPayoutStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED" | "REVERSED";

export interface PayoutWebhookEvent {
  providerTransferId: string;
  status: NormalizedPayoutStatus;
  utr?: string;
  rawType?: string;
}

export interface TransferStatusResult {
  status: NormalizedPayoutStatus;
  utr?: string;
}

/**
 * Abstraction over a payout/transfer provider. Business logic (server
 * actions, the webhook handler, reconciliation) depends only on this
 * interface, never on CashfreePayoutsProvider directly - swapping providers
 * later means implementing this interface, not rewriting payout logic.
 */
export interface PayoutProvider {
  createBeneficiary(input: CreateBeneficiaryInput): Promise<{ beneficiaryId: string }>;
  createPayout(input: CreatePayoutInput): Promise<CreatePayoutResult>;
  verifyWebhookSignature(rawBody: string, headers: Headers): boolean;
  parseWebhookEvent(rawBody: string): PayoutWebhookEvent;
  getTransferStatus(transferId: string): Promise<TransferStatusResult>;
}
