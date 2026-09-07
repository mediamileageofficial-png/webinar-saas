import "server-only";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { NormalizedPayoutStatus } from "./provider";
import { logPayoutAudit } from "./audit";

export interface PayoutTransactionRow {
  id: string;
  organization_id: string;
  payout_request_id: string;
  status: string;
}

export interface ApplyStatusOptions {
  utr?: string;
  rawPayload?: unknown;
  source: "webhook" | "reconciliation";
}

/**
 * The single source of truth for "should this new status actually be
 * applied, and what does applying it cascade into". Both the Cashfree
 * webhook handler AND the reconciliation cron call this - if they each had
 * their own copy of the terminal-state guard, the two paths could silently
 * drift apart (e.g. a bug fix landing in one but not the other), which is
 * exactly the kind of thing that causes a payout to be double-processed or
 * a confirmed success to get downgraded.
 *
 * Idempotency rule: once a transaction reaches a terminal state
 * (SUCCESS/FAILED/REVERSED), nothing can change it except the one
 * genuinely-real transition of SUCCESS -> REVERSED (a downstream bank
 * reversal, which Cashfree can send even after confirming success).
 */
export async function applyPayoutTransactionStatus(
  supabase: ReturnType<typeof createAdminClient>,
  transaction: PayoutTransactionRow,
  newStatus: NormalizedPayoutStatus,
  options: ApplyStatusOptions
): Promise<{ applied: boolean }> {
  const terminalStates = ["SUCCESS", "FAILED", "REVERSED"];
  if (terminalStates.includes(transaction.status)) {
    const allowedTransition = transaction.status === "SUCCESS" && newStatus === "REVERSED";
    if (!allowedTransition) {
      return { applied: false };
    }
  }

  if (transaction.status === newStatus) {
    return { applied: false };
  }

  const { error } = await supabase
    .from("payout_transactions")
    .update({
      status: newStatus,
      ...(options.utr ? { utr: options.utr } : {}),
      ...(options.rawPayload ? { raw_webhook_payload: options.rawPayload } : {}),
    })
    .eq("id", transaction.id);

  if (error) {
    console.error("[applyPayoutTransactionStatus] update failed", error);
    return { applied: false };
  }

  if (newStatus === "SUCCESS" || newStatus === "FAILED" || newStatus === "REVERSED") {
    const requestStatus =
      newStatus === "SUCCESS" ? "success" : newStatus === "FAILED" ? "failed" : "reversed";
    await supabase
      .from("payout_requests")
      .update({ status: requestStatus })
      .eq("id", transaction.payout_request_id);
  }

  await logPayoutAudit({
    organizationId: transaction.organization_id,
    action: options.source === "webhook" ? "webhook_received" : "reconciliation_run",
    entityType: "payout_transaction",
    entityId: transaction.id,
    metadata: { fromStatus: transaction.status, toStatus: newStatus, source: options.source },
  });

  return { applied: true };
}
