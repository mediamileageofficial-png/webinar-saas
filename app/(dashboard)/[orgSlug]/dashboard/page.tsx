import { notFound } from "next/navigation";
import {
  Users,
  CalendarPlus,
  Video,
  CreditCard,
  IndianRupee,
  UserCheck,
  UserX,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { getMembershipForOrgSlug } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getOnboardingChecklist } from "@/lib/onboarding/checklist";
import { OnboardingChecklist } from "./onboarding-checklist";

const TINTS: Record<string, string> = {
  orange: "bg-orange-50 text-orange-600",
  navy: "bg-slate-100 text-slate-700",
  green: "bg-green-50 text-green-600",
  red: "bg-red-50 text-red-600",
};

function startOfTodayIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const membership = await getMembershipForOrgSlug(orgSlug);
  if (!membership) notFound();

  const supabase = await createClient();
  const orgId = membership.organizationId;

  const [
    orgSettingsRes,
    totalRegistrationsRes,
    todayRegistrationsRes,
    activeWebinarsRes,
    paidRegistrationsRes,
    pendingPaymentsRes,
    successfulPaymentsRes,
    attendanceRes,
  ] = await Promise.all([
    supabase.from("organizations").select("settings").eq("id", orgId).maybeSingle(),
    supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId),
    supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("created_at", startOfTodayIso()),
    supabase
      .from("webinars")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .in("status", ["published", "registration_open"]),
    supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("payment_status", "success"),
    supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .in("payment_status", ["pending", "initiated"]),
    supabase.from("payments").select("amount").eq("organization_id", orgId).eq("status", "success"),
    // Attendance rate needs BOTH attended and not-attended rows to compute a
    // meaningful percentage - fetching the boolean column directly rather
    // than two separate counts keeps this to one query.
    supabase.from("attendance").select("attended").eq("organization_id", orgId),
  ]);

  const revenue =
    successfulPaymentsRes.data?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;

  const attendanceRows = attendanceRes.data ?? [];
  const attendedCount = attendanceRows.filter((a) => a.attended).length;
  const noShowCount = attendanceRows.filter((a) => !a.attended).length;
  const attendanceRate =
    attendanceRows.length > 0
      ? `${((attendedCount / attendanceRows.length) * 100).toFixed(0)}%`
      : "—";

  const cards: {
    label: string;
    value: string | number;
    icon: LucideIcon;
    tint: keyof typeof TINTS;
  }[] = [
    { label: "Total registrations", value: totalRegistrationsRes.count ?? 0, icon: Users, tint: "orange" },
    { label: "Today's registrations", value: todayRegistrationsRes.count ?? 0, icon: CalendarPlus, tint: "navy" },
    { label: "Active webinars", value: activeWebinarsRes.count ?? 0, icon: Video, tint: "navy" },
    { label: "Paid registrations", value: paidRegistrationsRes.count ?? 0, icon: CreditCard, tint: "green" },
    { label: "Revenue", value: `₹${revenue.toLocaleString("en-IN")}`, icon: IndianRupee, tint: "orange" },
    { label: "Attendance rate", value: attendanceRate, icon: UserCheck, tint: "green" },
    { label: "No-show count", value: noShowCount, icon: UserX, tint: "red" },
    { label: "Pending payments", value: pendingPaymentsRes.count ?? 0, icon: Clock, tint: "red" },
  ];

  const onboardingDismissed = Boolean(
    (orgSettingsRes.data?.settings as Record<string, unknown> | null)?.onboardingDismissed
  );
  const checklistItems = onboardingDismissed
    ? []
    : await getOnboardingChecklist(supabase, orgId, orgSlug);
  const showChecklist = !onboardingDismissed && checklistItems.length > 0;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Signed in as{" "}
            <span className="font-medium text-slate-700">{membership.role}</span>{" "}
            of this organization.
          </p>
        </div>
      </div>

      {showChecklist && (
        <div className="mt-6">
          <OnboardingChecklist orgSlug={orgSlug} items={checklistItems} />
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${TINTS[card.tint]}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-400">
                {card.label}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                {card.value}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
