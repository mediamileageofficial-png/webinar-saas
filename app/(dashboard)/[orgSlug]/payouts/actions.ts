"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOrgRole } from "@/lib/auth/guards";
import { getServerUser } from "@/lib/auth/session";
import { bankAccountSchema } from "@/lib/validation/schemas/payout-account";
import { CashfreeBavProvider } from "@/lib/payouts/cashfree-bav";
import { getOrgCredentials } from "@/lib/integrations/credentials";
import { logPayoutAudit } from "@/lib/payouts/audit";

const OWNER_ONLY = ["organization_owner"] as const;

export interface PayoutAccountActionState {
  error?: string;
  success?: string;
}

export async function saveBankAccountAction(
  orgSlug: string,
  _prevState: PayoutAccountActionState,
  formData: FormData
): Promise<PayoutAccountActionState> {
  const membership = await requireOrgRole(orgSlug, [...OWNER_ONLY]);
  const user = await getServerUser();

  const parsed = bankAccountSchema.safeParse({
    accountHolderName: formData.get("accountHolderName"),
    accountNumber: formData.get("accountNumber"),
    ifscCode: formData.get("ifscCode"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  // payout_accounts is deny-all under RLS (0011_payout_rls.sql) - this MUST
  // go through the service-role client. Authorization already happened
  // above via requireOrgRole(owner); this action is the sole gatekeeper.
  const supabase = createAdminClient();

  const { data: row, error } = await supabase
    .from("payout_accounts")
    .upsert(
      {
        organization_id: membership.organizationId,
        account_holder_name: data.accountHolderName,
        account_number: data.accountNumber,
        ifsc_code: data.ifscCode,
        // Changing the account resets verification - a previously-verified
        // status must never silently carry over to a DIFFERENT account
        // number. Any edit here, even a typo fix, requires re-verification.
        bank_verification_status: "NOT_VERIFIED",
        bank_name: null,
        cashfree_beneficiary_id: null,
      },
      { onConflict: "organization_id" }
    )
    .select("id")
    .single();

  if (error || !row) {
    return { error: "Could not save bank account details." };
  }

  await logPayoutAudit({
    organizationId: membership.organizationId,
    actorUserId: user?.id,
    action: "account_updated",
    entityType: "payout_account",
    entityId: row.id,
    metadata: { ifscCode: data.ifscCode, last4: data.accountNumber.slice(-4) },
  });

  revalidatePath(`/${orgSlug}/payouts`);
  return { success: "Bank account saved. Run verification to enable payouts." };
}

export async function triggerVerificationAction(
  orgSlug: string
): Promise<{ error?: string; success?: string }> {
  const membership = await requireOrgRole(orgSlug, [...OWNER_ONLY]);
  const user = await getServerUser();

  const supabase = createAdminClient();

  const { data: account, error: fetchError } = await supabase
    .from("payout_accounts")
    .select("id, account_holder_name, account_number, ifsc_code")
    .eq("organization_id", membership.organizationId)
    .maybeSingle();

  if (fetchError || !account) {
    return { error: "Add a bank account before running verification." };
  }

  const credentials = await getOrgCredentials(membership.organizationId, "cashfree_verification");
  const provider = new CashfreeBavProvider(credentials);

  try {
    const result = await provider.verifyBankAccount({
      accountNumber: account.account_number,
      ifsc: account.ifsc_code,
      accountHolderName: account.account_holder_name,
    });

    await supabase.from("payout_verifications").insert({
      organization_id: membership.organizationId,
      payout_account_id: account.id,
      provider_reference_id: result.providerReferenceId ?? null,
      status: result.status,
      name_match_result: result.nameMatchResult ?? null,
      name_match_score: result.nameMatchScore ?? null,
      matched_bank_name: result.bankName ?? null,
      failure_reason: result.failureReason ?? null,
      raw_response: result.rawResponse,
    });

    // Never mark VERIFIED merely because the API call succeeded - only
    // because the response's own status genuinely says so (result.status
    // was computed by CashfreeBavProvider from account_status + name match,
    // not from "the HTTP request didn't throw").
    await supabase
      .from("payout_accounts")
      .update({
        bank_verification_status: result.status,
        bank_name: result.bankName ?? null,
      })
      .eq("id", account.id);

    await logPayoutAudit({
      organizationId: membership.organizationId,
      actorUserId: user?.id,
      action: "verification_attempted",
      entityType: "payout_verification",
      entityId: account.id,
      metadata: { status: result.status, nameMatchResult: result.nameMatchResult },
    });

    revalidatePath(`/${orgSlug}/payouts`);

    if (result.status === "VERIFIED") {
      return { success: "Bank account verified. Payouts can now be sent to this account." };
    }
    if (result.status === "NAME_MISMATCH") {
      return {
        error:
          "The account holder name doesn't closely match bank records. Double-check and re-enter your details.",
      };
    }
    return { error: "Bank account verification failed. Check the account number and IFSC." };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Verification request failed.";

    await supabase.from("payout_verifications").insert({
      organization_id: membership.organizationId,
      payout_account_id: account.id,
      status: "FAILED",
      failure_reason: reason,
    });
    await supabase
      .from("payout_accounts")
      .update({ bank_verification_status: "FAILED" })
      .eq("id", account.id);

    await logPayoutAudit({
      organizationId: membership.organizationId,
      actorUserId: user?.id,
      action: "verification_attempted",
      entityType: "payout_verification",
      entityId: account.id,
      metadata: { status: "FAILED", reason },
    });

    revalidatePath(`/${orgSlug}/payouts`);
    return { error: reason };
  }
}
