import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface PayoutAccountStatus {
  configured: boolean;
  accountHolderName?: string;
  last4?: string;
  ifscCode?: string;
  bankName?: string;
  verificationStatus: "NOT_VERIFIED" | "PENDING" | "VERIFIED" | "NAME_MISMATCH" | "FAILED";
  updatedAt?: string;
}

/**
 * Returns ONLY what's safe to show in the UI: masked account (last 4
 * digits), IFSC (a public branch code, not secret), bank name, and
 * verification status - never the full account number. This is the only
 * read path a page should use for payout_accounts; payout_accounts itself
 * is deny-all under RLS (see 0011_payout_rls.sql), so this necessarily uses
 * the service-role client.
 */
export async function getPayoutAccountStatus(organizationId: string): Promise<PayoutAccountStatus> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("payout_accounts")
    .select("account_holder_name, account_number, ifsc_code, bank_name, bank_verification_status, updated_at")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (!data) {
    return { configured: false, verificationStatus: "NOT_VERIFIED" };
  }

  return {
    configured: true,
    accountHolderName: data.account_holder_name,
    last4: data.account_number.slice(-4),
    ifscCode: data.ifsc_code,
    bankName: data.bank_name ?? undefined,
    verificationStatus: data.bank_verification_status,
    updatedAt: data.updated_at,
  };
}
