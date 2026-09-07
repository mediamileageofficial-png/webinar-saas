import "server-only";
import type {
  BankVerificationProvider,
  BankAccountDetails,
  BankVerificationResult,
} from "./provider";

function baseUrl(isProduction: boolean): string {
  return isProduction
    ? "https://api.cashfree.com/verification"
    : "https://sandbox.cashfree.com/verification";
}

/**
 * Name-match thresholds: this is a product decision, not something Cashfree
 * dictates. DIRECT_MATCH and GOOD_PARTIAL_MATCH are treated as a confident
 * enough match to allow payouts; MODERATE_PARTIAL_MATCH, POOR_PARTIAL_MATCH,
 * and NO_MATCH require the host to double-check and re-enter their details
 * (NAME_MISMATCH), rather than silently accepting a weak match on money
 * movement. Documented here so the threshold is visible and adjustable.
 */
const ACCEPTABLE_NAME_MATCHES = new Set(["DIRECT_MATCH", "GOOD_PARTIAL_MATCH"]);

export class CashfreeBavProvider implements BankVerificationProvider {
  private clientId: string;
  private clientSecret: string;
  private isProduction: boolean;

  constructor(orgCredentials?: Record<string, string> | null) {
    this.clientId = orgCredentials?.verificationClientId ?? "";
    this.clientSecret = orgCredentials?.verificationClientSecret ?? "";
    this.isProduction = orgCredentials?.env === "production";
  }

  async verifyBankAccount(details: BankAccountDetails): Promise<BankVerificationResult> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error(
        "Cashfree Bank Account Verification is not configured for this organization."
      );
    }

    const res = await fetch(`${baseUrl(this.isProduction)}/bank-account/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": this.clientId,
        "x-client-secret": this.clientSecret,
      },
      body: JSON.stringify({
        bank_account: details.accountNumber,
        ifsc: details.ifsc,
        name: details.accountHolderName,
      }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data) {
      throw new Error(data?.message || "Bank account verification request failed.");
    }

    return this.mapResponseToResult(data);
  }

  /**
   * Pulled out as its own method (not inlined in verifyBankAccount) so it
   * can be tested directly against Cashfree's documented example responses
   * without needing a live network call - see the standalone verification
   * script run before this file was wired into anything.
   */
  private mapResponseToResult(data: Record<string, unknown>): BankVerificationResult {
    const accountStatus = data.account_status as string | null;
    const accountStatusCode = data.account_status_code as string | null;
    const nameMatchResult = data.name_match_result as string | null;

    let status: BankVerificationResult["status"];
    let failureReason: string | undefined;

    if (accountStatus !== "VALID") {
      status = "FAILED";
      failureReason = accountStatusCode ?? "Account verification failed.";
    } else if (!nameMatchResult) {
      status = "VERIFIED";
    } else if (ACCEPTABLE_NAME_MATCHES.has(nameMatchResult)) {
      status = "VERIFIED";
    } else {
      status = "NAME_MISMATCH";
      failureReason = `Name match result: ${nameMatchResult}`;
    }

    return {
      providerReferenceId:
        data.reference_id !== undefined && data.reference_id !== null
          ? String(data.reference_id)
          : undefined,
      status,
      matchedName: (data.name_at_bank as string | null) ?? undefined,
      nameMatchResult: nameMatchResult ?? undefined,
      nameMatchScore:
        data.name_match_score !== undefined && data.name_match_score !== null
          ? Number(data.name_match_score)
          : undefined,
      bankName: (data.bank_name as string | null) ?? undefined,
      failureReason,
      rawResponse: data,
    };
  }
}
