import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { CashfreePayoutsProvider } from "./cashfree-payouts";
import { getOrgCredentials } from "@/lib/integrations/credentials";
import { applyPayoutTransactionStatus } from "./apply-status";

/**
 * How long a transaction can sit in PENDING/PROCESSING before reconciliation
 * bothers checking it. Below this, a webhook is still the expected, faster
 * path - reconciliation exists to catch the cases where a webhook was
 * missed or delayed, not to race it.
 */
const STUCK_THRESHOLD_MINUTES = 10;

export interface ReconciliationResult {
  checked: number;
  corrected: number;
  errors: number;
}

/**
 * Cron-driven: finds payout_transactions stuck in a non-terminal state
 * beyond the threshold, asks Cashfree directly (Get Transfer Status) what
 * really happened, and reconciles our stored status against reality -
 * exactly the plan's "Use Cashfree's final payout status/webhook for
 * reconciliation" requirement, for the case where the webhook path alone
 * isn't enough (missed delivery, endpoint downtime, etc.).
 */
export async function runPayoutReconciliation(): Promise<ReconciliationResult> {
  const supabase = createAdminClient();
  const result: ReconciliationResult = { checked: 0, corrected: 0, errors: 0 };

  const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MINUTES * 60_000).toISOString();

  const { data: stuckTransactions } = await supabase
    .from("payout_transactions")
    .select("id, organization_id, payout_request_id, provider_transfer_id, status")
    .in("status", ["PENDING", "PROCESSING"])
    .lt("created_at", cutoff);

  for (const tx of stuckTransactions ?? []) {
    result.checked += 1;
    if (!tx.provider_transfer_id) continue;

    try {
      const credentials = await getOrgCredentials(tx.organization_id, "cashfree_payouts");
      const provider = new CashfreePayoutsProvider(credentials);
      const statusResult = await provider.getTransferStatus(tx.provider_transfer_id);

      const previousStatus = tx.status;
      const applyResult = await applyPayoutTransactionStatus(
        supabase,
        {
          id: tx.id,
          organization_id: tx.organization_id,
          payout_request_id: tx.payout_request_id,
          status: tx.status,
        },
        statusResult.status,
        { utr: statusResult.utr, source: "reconciliation" }
      );

      await supabase.from("payout_reconciliations").insert({
        organization_id: tx.organization_id,
        payout_transaction_id: tx.id,
        previous_status: previousStatus,
        checked_status: statusResult.status,
        corrected: applyResult.applied,
      });

      if (applyResult.applied) result.corrected += 1;
    } catch (err) {
      result.errors += 1;
      console.error("[payout reconciliation]", tx.id, err);
    }
  }

  return result;
}
