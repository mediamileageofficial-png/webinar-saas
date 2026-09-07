"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { getServerUser } from "@/lib/auth/session";
import { createPayoutRequestSchema } from "@/lib/validation/schemas/payout-request";
import { CashfreePayoutsProvider } from "@/lib/payouts/cashfree-payouts";
import { getOrgCredentials } from "@/lib/integrations/credentials";
import { logPayoutAudit } from "@/lib/payouts/audit";

export interface PayoutRequestActionState {
  error?: string;
  success?: string;
}

export async function createPayoutRequestAction(
  _prevState: PayoutRequestActionState,
  formData: FormData
): Promise<PayoutRequestActionState> {
  await requirePlatformAdmin();
  const user = await getServerUser();

  const parsed = createPayoutRequestSchema.safeParse({
    organizationId: formData.get("organizationId"),
    amount: formData.get("amount"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const supabase = createAdminClient();
  const { data: row, error } = await supabase
    .from("payout_requests")
    .insert({
      organization_id: data.organizationId,
      requested_by: user!.id,
      amount: Number(data.amount),
      notes: data.notes ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !row) {
    return { error: "Could not create the payout request." };
  }

  await logPayoutAudit({
    organizationId: data.organizationId,
    actorUserId: user?.id,
    action: "payout_requested",
    entityType: "payout_request",
    entityId: row.id,
    metadata: { amount: Number(data.amount) },
  });

  revalidatePath("/admin/payouts");
  return { success: "Payout request created." };
}

export async function approvePayoutRequestAction(
  requestId: string
): Promise<{ error?: string }> {
  await requirePlatformAdmin();
  const user = await getServerUser();
  const supabase = createAdminClient();

  const { data: request, error: fetchError } = await supabase
    .from("payout_requests")
    .select("id, organization_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (fetchError || !request) return { error: "Payout request not found." };
  if (request.status !== "pending") {
    return { error: `Cannot approve a request that is already "${request.status}".` };
  }

  const { error } = await supabase
    .from("payout_requests")
    .update({ status: "approved" })
    .eq("id", requestId);

  if (error) return { error: "Could not approve the request." };

  await logPayoutAudit({
    organizationId: request.organization_id,
    actorUserId: user?.id,
    action: "payout_approved",
    entityType: "payout_request",
    entityId: requestId,
  });

  revalidatePath("/admin/payouts");
  return {};
}

export async function rejectPayoutRequestAction(requestId: string): Promise<{ error?: string }> {
  await requirePlatformAdmin();
  const user = await getServerUser();
  const supabase = createAdminClient();

  const { data: request, error: fetchError } = await supabase
    .from("payout_requests")
    .select("id, organization_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (fetchError || !request) return { error: "Payout request not found." };
  if (request.status === "processing" || request.status === "success") {
    return { error: `Cannot reject a request that is already "${request.status}".` };
  }

  const { error } = await supabase
    .from("payout_requests")
    .update({ status: "rejected" })
    .eq("id", requestId);

  if (error) return { error: "Could not reject the request." };

  await logPayoutAudit({
    organizationId: request.organization_id,
    actorUserId: user?.id,
    action: "payout_rejected",
    entityType: "payout_request",
    entityId: requestId,
  });

  revalidatePath("/admin/payouts");
  return {};
}

/**
 * The critical action. Two safety properties, both deliberate:
 *
 * 1. HARD ELIGIBILITY GATE: refuses unless the org's bank account is
 *    currently VERIFIED, re-checked at this exact moment (never trusts a
 *    cached/earlier page load's status).
 *
 * 2. RETRY-SAFE TRANSFER IDS: Cashfree's own docs warn that a 5xx response
 *    from the transfer API is AMBIGUOUS - the transfer may have actually
 *    been created despite the error, and re-submitting with a fresh
 *    transfer_id risks a genuine double payment. So: if a non-terminal-
 *    failed transaction already exists for this request (PENDING/
 *    PROCESSING/SUCCESS), this action does NOT call Cashfree again - it
 *    just reports the existing state. A new Cashfree call only ever happens
 *    when there is no transaction yet, or the most recent one is a
 *    genuinely confirmed FAILED (via webhook/status check, not a guess).
 */
export async function initiatePayoutAction(
  requestId: string
): Promise<{ error?: string; success?: string }> {
  await requirePlatformAdmin();
  const user = await getServerUser();
  const supabase = createAdminClient();

  const { data: request, error: requestError } = await supabase
    .from("payout_requests")
    .select("id, organization_id, amount, currency, status")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError || !request) return { error: "Payout request not found." };
  if (request.status !== "approved" && request.status !== "failed") {
    return {
      error: `Payout request must be "approved" before it can be initiated (currently "${request.status}").`,
    };
  }

  const { data: existingTransactions } = await supabase
    .from("payout_transactions")
    .select("id, status")
    .eq("payout_request_id", requestId)
    .order("created_at", { ascending: false });

  const blockingTransaction = existingTransactions?.find((t) =>
    ["PENDING", "PROCESSING", "SUCCESS"].includes(t.status)
  );
  if (blockingTransaction) {
    return {
      error: `A transfer is already ${blockingTransaction.status.toLowerCase()} for this request - not submitting another.`,
    };
  }
  const attemptNumber = (existingTransactions?.length ?? 0) + 1;

  const { data: account, error: accountError } = await supabase
    .from("payout_accounts")
    .select(
      "id, account_holder_name, account_number, ifsc_code, bank_verification_status, cashfree_beneficiary_id"
    )
    .eq("organization_id", request.organization_id)
    .maybeSingle();

  if (accountError || !account) {
    return { error: "This organization has no bank account on file." };
  }
  if (account.bank_verification_status !== "VERIFIED") {
    return {
      error: `Payout blocked: bank account status is "${account.bank_verification_status}", not VERIFIED.`,
    };
  }

  const credentials = await getOrgCredentials(request.organization_id, "cashfree_payouts");
  const provider = new CashfreePayoutsProvider(credentials);

  const beneficiaryId = account.cashfree_beneficiary_id ?? account.id.replace(/-/g, "");
  const transferId = `po_${requestId.replace(/-/g, "")}_${attemptNumber}`;

  try {
    if (!account.cashfree_beneficiary_id) {
      await provider.createBeneficiary({
        beneficiaryId,
        name: account.account_holder_name,
        accountNumber: account.account_number,
        ifsc: account.ifsc_code,
      });
      await supabase
        .from("payout_accounts")
        .update({ cashfree_beneficiary_id: beneficiaryId })
        .eq("id", account.id);
    }

    const result = await provider.createPayout({
      transferId,
      amount: Number(request.amount),
      currency: request.currency,
      beneficiaryId,
      remarks: `Payout for request ${requestId}`,
    });

    const { error: txError } = await supabase.from("payout_transactions").insert({
      organization_id: request.organization_id,
      payout_request_id: requestId,
      provider_transfer_id: result.providerTransferId,
      provider_cf_transfer_id: result.providerCfTransferId ?? null,
      amount: request.amount,
      currency: request.currency,
      status: "PROCESSING",
      idempotency_key: transferId,
    });

    if (txError) {
      await logPayoutAudit({
        organizationId: request.organization_id,
        actorUserId: user?.id,
        action: "payout_initiated",
        entityType: "payout_request",
        entityId: requestId,
        metadata: { error: "transfer_accepted_but_not_recorded", transferId },
      });
      return {
        error:
          "Cashfree accepted the transfer but we could not record it. Check Cashfree's dashboard for this transfer_id before retrying: " +
          transferId,
      };
    }

    await supabase.from("payout_requests").update({ status: "processing" }).eq("id", requestId);

    await logPayoutAudit({
      organizationId: request.organization_id,
      actorUserId: user?.id,
      action: "payout_initiated",
      entityType: "payout_request",
      entityId: requestId,
      metadata: { transferId, attemptNumber },
    });

    revalidatePath("/admin/payouts");
    return { success: "Transfer submitted to Cashfree. Status will update via webhook." };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Transfer request failed.";
    await logPayoutAudit({
      organizationId: request.organization_id,
      actorUserId: user?.id,
      action: "payout_initiated",
      entityType: "payout_request",
      entityId: requestId,
      metadata: { error: reason, transferId, attemptNumber },
    });
    revalidatePath("/admin/payouts");
    return { error: reason };
  }
}
