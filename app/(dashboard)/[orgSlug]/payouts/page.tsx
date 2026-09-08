import { notFound } from "next/navigation";
import { getMembershipForOrgSlug } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getPayoutAccountStatus } from "@/lib/payouts/status";
import { BankAccountForm } from "./bank-account-form";
import { VerifyButton } from "./verify-button";
import { AuditLogTable } from "./audit-log-table";

const STATUS_STYLES: Record<string, string> = {
  VERIFIED: "bg-green-50 text-green-700",
  PENDING: "bg-amber-50 text-amber-700",
  NOT_VERIFIED: "bg-slate-100 text-slate-500",
  NAME_MISMATCH: "bg-amber-50 text-amber-700",
  FAILED: "bg-red-50 text-red-600",
};

const PAYOUT_REQUEST_STATUS_STYLES: Record<string, string> = {
  pending: "bg-slate-100 text-slate-600",
  approved: "bg-slate-100 text-slate-700",
  processing: "bg-amber-50 text-amber-700",
  success: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-600",
  rejected: "bg-red-50 text-red-600",
  reversed: "bg-red-50 text-red-600",
};

export default async function PayoutsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const membership = await getMembershipForOrgSlug(orgSlug);
  if (!membership) notFound();

  const isOwner = membership.role === "organization_owner";
  const accountStatus = await getPayoutAccountStatus(membership.organizationId);

  // payout_requests has a normal tenant SELECT policy (org members +
  // platform_admin) - unlike payout_accounts, this table isn't deny-all, so
  // the RLS-respecting client is the right one here.
  const supabase = await createClient();
  const { data: payoutRequests } = await supabase
    .from("payout_requests")
    .select("id, amount, currency, status, notes, created_at")
    .eq("organization_id", membership.organizationId)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Payouts</h1>
      <p className="mt-1 text-sm text-slate-500">
        Bank verification here covers account collection, Cashfree bank
        verification, and name matching only - not full KYC/KYB.
      </p>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-slate-900">Bank account</h2>

        {accountStatus.configured ? (
          <div className="mt-2 rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {accountStatus.accountHolderName}
                </p>
                <p className="text-sm text-slate-500">
                  &bull;&bull;&bull;&bull; {accountStatus.last4} &middot; {accountStatus.ifscCode}
                  {accountStatus.bankName ? ` \u00b7 ${accountStatus.bankName}` : ""}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  STATUS_STYLES[accountStatus.verificationStatus] ?? "bg-slate-100 text-slate-600"
                }`}
              >
                {accountStatus.verificationStatus.replace("_", " ")}
              </span>
            </div>

            {isOwner && accountStatus.verificationStatus !== "VERIFIED" && (
              <div className="mt-4">
                <VerifyButton orgSlug={orgSlug} />
              </div>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-400">No bank account on file yet.</p>
        )}

        {isOwner && (
          <div className="mt-4">
            <p className="mb-2 text-sm text-slate-500">
              {accountStatus.configured
                ? "Update the bank account (this resets verification):"
                : "Add a bank account to receive payouts:"}
            </p>
            <BankAccountForm orgSlug={orgSlug} />
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold text-slate-900">Payout history</h2>
        <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full min-w-[42rem] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Notes</th>
                <th className="px-4 py-2 font-medium">Requested</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(!payoutRequests || payoutRequests.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                    No payout requests yet.
                  </td>
                </tr>
              )}
              {payoutRequests?.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {r.currency} {r.amount}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        PAYOUT_REQUEST_STATUS_STYLES[r.status] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{r.notes ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Payout requests are created by the platform - contact support to
          request a payout.
        </p>
      </section>
      <section className="mt-10">
        <h2 className="text-sm font-semibold text-slate-900">Activity log</h2>
        <p className="mt-1 text-sm text-slate-500">
          Every change to your bank account, verification, and payouts.
        </p>
        <AuditLogTable organizationId={membership.organizationId} />
      </section>
    </div>
  );
}
