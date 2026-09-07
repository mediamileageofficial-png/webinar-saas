import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { CreateRequestForm } from "./create-request-form";
import { RequestRowActions } from "./request-row-actions";

const REQUEST_STATUS_STYLES: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600",
  approved: "bg-blue-50 text-blue-700",
  processing: "bg-amber-50 text-amber-700",
  success: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-600",
  rejected: "bg-red-50 text-red-600",
  reversed: "bg-red-50 text-red-600",
};

const VERIFICATION_STYLES: Record<string, string> = {
  VERIFIED: "text-emerald-700",
  NOT_VERIFIED: "text-slate-400",
  PENDING: "text-amber-600",
  NAME_MISMATCH: "text-amber-600",
  FAILED: "text-red-600",
};

export default async function AdminPayoutsPage() {
  const supabase = await createClient();
  const adminSupabase = createAdminClient(); // payout_accounts is deny-all - status must come from service role

  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .order("name", { ascending: true });

  const { data: requests } = await supabase
    .from("payout_requests")
    .select("id, organization_id, amount, currency, status, notes, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const orgById = new Map((organizations ?? []).map((o) => [o.id, o]));

  // Bank verification status per org, needed to grey out "Initiate" when
  // not eligible - fetched via service role since payout_accounts is deny-all.
  const orgIds = Array.from(new Set((requests ?? []).map((r) => r.organization_id)));
  const { data: accounts } = orgIds.length
    ? await adminSupabase
        .from("payout_accounts")
        .select("organization_id, bank_verification_status")
        .in("organization_id", orgIds)
    : { data: [] };
  const verificationByOrg = new Map(
    (accounts ?? []).map((a) => [a.organization_id, a.bank_verification_status])
  );

  const { data: transactions } = await supabase
    .from("payout_transactions")
    .select("payout_request_id, status, utr, created_at")
    .order("created_at", { ascending: false });
  const latestTransactionByRequest = new Map<string, { status: string; utr: string | null }>();
  transactions?.forEach((t) => {
    if (!latestTransactionByRequest.has(t.payout_request_id)) {
      latestTransactionByRequest.set(t.payout_request_id, { status: t.status, utr: t.utr });
    }
  });

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Payouts</h1>
      <p className="mt-1 text-sm text-slate-500">
        Payout requests, approvals, and Cashfree transfer status across every
        organization. A transfer can only be initiated once the
        organization&apos;s bank account is VERIFIED.
      </p>
      <Link
        href="/admin/payouts/audit"
        className="mt-1 inline-block text-sm font-medium text-slate-600 hover:underline"
      >
        View reconciliation &amp; audit log &rarr;
      </Link>

      <div className="mt-6">
        <CreateRequestForm organizations={organizations ?? []} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Organization</th>
              <th className="px-4 py-2 font-medium">Amount</th>
              <th className="px-4 py-2 font-medium">Request status</th>
              <th className="px-4 py-2 font-medium">Bank verification</th>
              <th className="px-4 py-2 font-medium">Transfer status</th>
              <th className="px-4 py-2 font-medium">Requested</th>
              <th className="px-4 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(!requests || requests.length === 0) && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  No payout requests yet.
                </td>
              </tr>
            )}
            {requests?.map((r) => {
              const org = orgById.get(r.organization_id);
              const verificationStatus = verificationByOrg.get(r.organization_id) ?? "NOT_VERIFIED";
              const latestTx = latestTransactionByRequest.get(r.id);
              return (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">{org?.name ?? "Unknown"}</td>
                  <td className="px-4 py-3 text-slate-900">
                    {r.currency} {r.amount}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        REQUEST_STATUS_STYLES[r.status] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-medium ${
                        VERIFICATION_STYLES[verificationStatus] ?? "text-slate-400"
                      }`}
                    >
                      {verificationStatus.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {latestTx ? (
                      <>
                        {latestTx.status}
                        {latestTx.utr && <div className="text-slate-400">UTR: {latestTx.utr}</div>}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RequestRowActions
                      requestId={r.id}
                      status={r.status}
                      verificationStatus={verificationStatus}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
