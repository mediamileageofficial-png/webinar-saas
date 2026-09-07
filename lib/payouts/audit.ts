import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type PayoutAuditAction =
  | "account_created"
  | "account_updated"
  | "verification_attempted"
  | "payout_requested"
  | "payout_approved"
  | "payout_rejected"
  | "payout_initiated"
  | "webhook_received"
  | "reconciliation_run"
  | "status_changed";

export interface LogPayoutAuditInput {
  organizationId: string;
  actorUserId?: string | null;
  action: PayoutAuditAction;
  entityType: "payout_account" | "payout_verification" | "payout_request" | "payout_transaction";
  entityId?: string | null;
  /**
   * Summary data only. NEVER include a raw account number, IFSC (fine, but
   * unnecessary), or any Cashfree secret here - metadata is readable by the
   * organization's own members via payout_audit_logs' SELECT policy.
   */
  metadata?: Record<string, unknown>;
}

/**
 * Writes one append-only audit row. Uses the service-role client because
 * payout_audit_logs has NO insert policy for any client role (see
 * 0011_payout_rls.sql) - forging an audit entry from the browser must be
 * impossible. This function itself performs no authorization check; callers
 * must only invoke it from already-authorized server-side code.
 */
export async function logPayoutAudit(input: LogPayoutAuditInput): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("payout_audit_logs").insert({
    organization_id: input.organizationId,
    actor_user_id: input.actorUserId ?? null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    // Auditing must never block the operation it's auditing - log server-side
    // and move on, same "never throw" philosophy as sendTemplatedMessage.
    console.error("[logPayoutAudit] failed to write audit row", error);
  }
}
