import { notFound } from "next/navigation";
import { getMembershipForOrgSlug } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const STATUS_STYLES: Record<string, string> = {
  success: "bg-green-50 text-green-700",
  pending: "bg-amber-50 text-amber-700",
  initiated: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-600",
  cancelled: "bg-red-50 text-red-600",
  refunded: "bg-slate-100 text-slate-600",
};

export default async function PaymentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { orgSlug } = await params;
  const { status } = await searchParams;
  const membership = await getMembershipForOrgSlug(orgSlug);
  if (!membership) notFound();

  const supabase = await createClient();

  let query = supabase
    .from("payments")
    .select(
      "id, amount, currency, status, provider, provider_order_id, created_at, registrations(full_name, email, forms(name))"
    )
    .eq("organization_id", membership.organizationId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (status) query = query.eq("status", status);

  const { data: payments, error } = await query;

  const totalRevenue =
    payments
      ?.filter((p) => p.status === "success")
      .reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Payments</h1>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-2">
          <p className="text-xs font-medium uppercase text-slate-400">
            Revenue (filtered view)
          </p>
          <p className="text-lg font-semibold text-slate-900">
            ₹{totalRevenue.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      <form method="get" className="mt-4 flex items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Status</label>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="w-48 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="">Any</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600"
        >
          Filter
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[42rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Registrant</th>
              <th className="px-4 py-2 font-medium">Form</th>
              <th className="px-4 py-2 font-medium">Amount</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Provider order</th>
              <th className="px-4 py-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {error && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-red-600">
                  Could not load payments.
                </td>
              </tr>
            )}
            {!error && payments?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  No payments match these filters.
                </td>
              </tr>
            )}
            {payments?.map((p) => {
              const registration = Array.isArray(p.registrations)
                ? p.registrations[0]
                : p.registrations;
              const form = registration
                ? Array.isArray(registration.forms)
                  ? registration.forms[0]
                  : registration.forms
                : null;
              return (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {registration?.full_name ?? "—"}
                    <div className="text-xs font-normal text-slate-400">
                      {registration?.email ?? ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{form?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-900">
                    {p.currency} {p.amount}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[p.status] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {p.provider}/{p.provider_order_id}
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(p.created_at).toLocaleDateString()}
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
