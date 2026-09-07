import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPayoutAuditPage() {
  const supabase = await createClient();

  const [{ data: reconciliations }, { data: auditLogs }, { data: organizations }] =
    await Promise.all([
      supabase
        .from("payout_reconciliations")
        .select("id, organization_id, previous_status, checked_status, corrected, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("payout_audit_logs")
        .select("id, organization_id, action, entity_type, entity_id, metadata, created_at")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("organizations").select("id, name"),
    ]);

  const orgNameById = new Map((organizations ?? []).map((o) => [o.id, o.name]));

  return (
    <div>
      <Link href="/admin/payouts" className="text-xs text-slate-400 hover:underline">
        &larr; Payout requests
      </Link>
      <h1 className="mt-1 text-lg font-semibold text-slate-900">
        Payout reconciliation &amp; audit log
      </h1>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-slate-900">Recent reconciliation checks</h2>
        <p className="mt-1 text-sm text-slate-500">
          The reconciliation cron re-checks any transfer stuck in a
          non-terminal state for more than 10 minutes directly against
          Cashfree, in case a webhook was missed.
        </p>
        <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Organization</th>
                <th className="px-4 py-2 font-medium">Was</th>
                <th className="px-4 py-2 font-medium">Found to be</th>
                <th className="px-4 py-2 font-medium">Corrected drift?</th>
                <th className="px-4 py-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(!reconciliations || reconciliations.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No reconciliation runs yet.
                  </td>
                </tr>
              )}
              {reconciliations?.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-slate-900">
                    {orgNameById.get(r.organization_id) ?? "Unknown"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{r.previous_status}</td>
                  <td className="px-4 py-3 text-slate-500">{r.checked_status}</td>
                  <td className="px-4 py-3">
                    {r.corrected ? (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Corrected
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">No change</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-slate-900">Audit log</h2>
        <p className="mt-1 text-sm text-slate-500">
          Every payout-related action across every organization, append-only.
        </p>
        <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Organization</th>
                <th className="px-4 py-2 font-medium">Action</th>
                <th className="px-4 py-2 font-medium">Entity</th>
                <th className="px-4 py-2 font-medium">Details</th>
                <th className="px-4 py-2 font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(!auditLogs || auditLogs.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No audit entries yet.
                  </td>
                </tr>
              )}
              {auditLogs?.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 text-slate-900">
                    {orgNameById.get(log.organization_id) ?? "Unknown"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{log.action}</td>
                  <td className="px-4 py-3 text-slate-500">{log.entity_type}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">
                    {JSON.stringify(log.metadata)}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
