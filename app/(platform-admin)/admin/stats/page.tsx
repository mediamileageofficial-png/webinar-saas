import { createClient } from "@/lib/supabase/server";

export default async function AdminStatsPage() {
  const supabase = await createClient();

  const [
    totalOrgsRes,
    activeOrgsRes,
    suspendedOrgsRes,
    totalRegistrationsRes,
    totalMessagesRes,
    successfulPaymentsRes,
  ] = await Promise.all([
    supabase.from("organizations").select("*", { count: "exact", head: true }),
    supabase
      .from("organizations")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("organizations")
      .select("*", { count: "exact", head: true })
      .eq("status", "suspended"),
    supabase.from("registrations").select("*", { count: "exact", head: true }),
    supabase.from("message_logs").select("*", { count: "exact", head: true }),
    supabase.from("payments").select("amount").eq("status", "success"),
  ]);

  const revenueTotal =
    successfulPaymentsRes.data?.reduce(
      (sum, row) => sum + Number(row.amount),
      0
    ) ?? 0;

  const cards = [
    { label: "Total organizations", value: totalOrgsRes.count ?? 0 },
    { label: "Active organizations", value: activeOrgsRes.count ?? 0 },
    { label: "Suspended organizations", value: suspendedOrgsRes.count ?? 0 },
    { label: "Total registrations", value: totalRegistrationsRes.count ?? 0 },
    { label: "Messages sent", value: totalMessagesRes.count ?? 0 },
    {
      label: "Verified payment volume",
      value: `₹${revenueTotal.toLocaleString("en-IN")}`,
    },
  ];

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Platform stats</h1>
      <p className="mt-1 text-sm text-slate-500">
        Usage across every tenant on the platform.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <p className="text-xs font-medium uppercase text-slate-400">
              {card.label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {card.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
