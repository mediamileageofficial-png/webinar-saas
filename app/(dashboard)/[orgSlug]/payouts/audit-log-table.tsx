import { createClient } from "@/lib/supabase/server";

const ACTION_LABELS: Record<string, string> = {
  account_created: "Bank account added",
  account_updated: "Bank account updated",
  verification_attempted: "Verification attempted",
  payout_requested: "Payout requested",
  payout_approved: "Payout approved",
  payout_rejected: "Payout rejected",
  payout_initiated: "Payout initiated",
  webhook_received: "Transfer status updated",
  reconciliation_run: "Status reconciled",
};

export async function AuditLogTable({ organizationId }: { organizationId: string }) {
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("payout_audit_logs")
    .select("id, action, created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[42rem] text-left text-sm">
        <tbody className="divide-y divide-slate-100">
          {(!logs || logs.length === 0) && (
            <tr>
              <td className="px-4 py-6 text-center text-slate-400">No activity yet.</td>
            </tr>
          )}
          {logs?.map((log) => (
            <tr key={log.id}>
              <td className="px-4 py-2.5 text-slate-700">
                {ACTION_LABELS[log.action] ?? log.action}
              </td>
              <td className="px-4 py-2.5 text-right text-xs text-slate-400">
                {new Date(log.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
