import Link from "next/link";
import { notFound } from "next/navigation";
import { getMembershipForOrgSlug } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { groupCount, sortedEntries } from "@/lib/analytics/aggregate";
import { BreakdownTable } from "./breakdown-table";

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ webinarId?: string; formId?: string }>;
}) {
  const { orgSlug } = await params;
  const { webinarId, formId } = await searchParams;
  const membership = await getMembershipForOrgSlug(orgSlug);
  if (!membership) notFound();

  const supabase = await createClient();
  const orgId = membership.organizationId;

  // MVP-scale: aggregate in application code rather than a SQL GROUP BY -
  // see lib/analytics/aggregate.ts for why that's an acceptable simplification.
  const [{ data: registrations }, { data: webinars }, { data: forms }, { data: attendanceRows }] =
    await Promise.all([
      supabase
        .from("registrations")
        .select("id, utm_source, utm_campaign, status, payment_status, webinar_id, form_id")
        .eq("organization_id", orgId)
        .limit(5000),
      supabase
        .from("webinars")
        .select("id, name")
        .eq("organization_id", orgId)
        .order("start_time", { ascending: false }),
      supabase
        .from("forms")
        .select("id, name, view_count")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false }),
      supabase.from("attendance").select("registration_id, attended").eq("organization_id", orgId),
    ]);

  const regs = registrations ?? [];
  const regById = new Map(regs.map((r) => [r.id, r]));

  const bySource = sortedEntries(groupCount(regs.map((r) => r.utm_source)));
  const byCampaign = sortedEntries(groupCount(regs.map((r) => r.utm_campaign)));
  const paidBySource = sortedEntries(
    groupCount(regs.filter((r) => r.payment_status === "success").map((r) => r.utm_source))
  );

  const attendedSources: (string | null)[] = [];
  (attendanceRows ?? []).forEach((a) => {
    if (a.attended) {
      const reg = regById.get(a.registration_id);
      if (reg) attendedSources.push(reg.utm_source);
    }
  });
  const attendanceBySource = sortedEntries(groupCount(attendedSources));

  // --- Webinar drill-down ---
  let webinarStats: {
    name: string;
    total: number;
    confirmed: number;
    pendingPayment: number;
    paymentSuccess: number;
    paymentFailure: number;
    attended: number;
    noShow: number;
    revenue: number;
    conversionRate: string;
    sourceBreakdown: [string, number][];
  } | null = null;

  if (webinarId) {
    const webinar = webinars?.find((w) => w.id === webinarId);
    const webinarRegs = regs.filter((r) => r.webinar_id === webinarId);
    const webinarRegIds = new Set(webinarRegs.map((r) => r.id));
    const webinarAttendance = (attendanceRows ?? []).filter((a) =>
      webinarRegIds.has(a.registration_id)
    );

    const { data: webinarPayments } = await supabase
      .from("payments")
      .select("amount")
      .eq("organization_id", orgId)
      .eq("status", "success")
      .in(
        "registration_id",
        webinarRegs.length > 0 ? webinarRegs.map((r) => r.id) : ["00000000-0000-0000-0000-000000000000"]
      );

    webinarStats = {
      name: webinar?.name ?? "Unknown webinar",
      total: webinarRegs.length,
      confirmed: webinarRegs.filter((r) => r.status === "confirmed").length,
      pendingPayment: webinarRegs.filter(
        (r) => r.payment_status === "pending" || r.payment_status === "initiated"
      ).length,
      paymentSuccess: webinarRegs.filter((r) => r.payment_status === "success").length,
      paymentFailure: webinarRegs.filter(
        (r) => r.payment_status === "failed" || r.payment_status === "cancelled"
      ).length,
      attended: webinarAttendance.filter((a) => a.attended).length,
      noShow: webinarAttendance.filter((a) => !a.attended).length,
      revenue: webinarPayments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0,
      conversionRate:
        webinarRegs.length > 0
          ? `${Math.round(
              (webinarRegs.filter((r) => r.status === "confirmed").length / webinarRegs.length) * 100
            )}%`
          : "—",
      sourceBreakdown: sortedEntries(groupCount(webinarRegs.map((r) => r.utm_source))),
    };
  }

  // --- Form drill-down ---
  let formStats: {
    name: string;
    views: number;
    submissions: number;
    conversionRate: string;
    paidConversions: number;
  } | null = null;

  if (formId) {
    const form = forms?.find((f) => f.id === formId);
    const formRegs = regs.filter((r) => r.form_id === formId);
    const views = form?.view_count ?? 0;
    formStats = {
      name: form?.name ?? "Unknown form",
      views,
      submissions: formRegs.length,
      conversionRate: views > 0 ? `${((formRegs.length / views) * 100).toFixed(1)}%` : "—",
      paidConversions: formRegs.filter((r) => r.payment_status === "success").length,
    };
  }

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Analytics</h1>
      <p className="mt-1 text-sm text-slate-500">
        Source attribution across every registration, plus drill-downs per
        webinar and form.
      </p>

      <h2 className="mt-8 text-sm font-semibold text-slate-900">
        Lead source &amp; marketing attribution
      </h2>
      <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <BreakdownTable title="Registrations by source" entries={bySource} />
        <BreakdownTable title="Registrations by campaign" entries={byCampaign} />
        <BreakdownTable
          title="Paid registrations by source"
          entries={paidBySource}
          emptyLabel="No paid registrations yet."
        />
        <BreakdownTable
          title="Attendance by source"
          entries={attendanceBySource}
          emptyLabel="No attendance marked yet."
        />
      </div>

      <h2 className="mt-8 text-sm font-semibold text-slate-900">Per-webinar breakdown</h2>
      <form method="get" className="mt-2 flex items-end gap-3">
        <input type="hidden" name="formId" value={formId ?? ""} />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Webinar</label>
          <select
            name="webinarId"
            defaultValue={webinarId ?? ""}
            className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="">Select a webinar...</option>
            {webinars?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600"
        >
          View
        </button>
      </form>

      {webinarStats && (
        <div className="mt-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              ["Total registrations", webinarStats.total],
              ["Confirmed", webinarStats.confirmed],
              ["Pending payment", webinarStats.pendingPayment],
              ["Payment success", webinarStats.paymentSuccess],
              ["Payment failure", webinarStats.paymentFailure],
              ["Attended", webinarStats.attended],
              ["No-show", webinarStats.noShow],
              ["Conversion", webinarStats.conversionRate],
              ["Revenue", `₹${webinarStats.revenue.toLocaleString("en-IN")}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-xs font-medium uppercase text-slate-400">{label}</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 max-w-xs">
            <BreakdownTable title={`${webinarStats.name} - source breakdown`} entries={webinarStats.sourceBreakdown} />
          </div>
        </div>
      )}

      <h2 className="mt-8 text-sm font-semibold text-slate-900">Per-form breakdown</h2>
      <form method="get" className="mt-2 flex items-end gap-3">
        <input type="hidden" name="webinarId" value={webinarId ?? ""} />
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Form</label>
          <select
            name="formId"
            defaultValue={formId ?? ""}
            className="w-64 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="">Select a form...</option>
            {forms?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600"
        >
          View
        </button>
      </form>

      {formStats && (
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            ["Views", formStats.views],
            ["Submissions", formStats.submissions],
            ["Conversion rate", formStats.conversionRate],
            ["Paid conversions", formStats.paidConversions],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium uppercase text-slate-400">{label}</p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 text-xs text-slate-400">
        Need the full registration list?{" "}
        <Link href={`/${orgSlug}/registrations`} className="underline">
          Go to Registrations
        </Link>
        .
      </p>
    </div>
  );
}
