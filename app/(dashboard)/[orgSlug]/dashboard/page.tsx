import Link from "next/link";
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
  BarChart3,
  PlayCircle,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { getMembershipForOrgSlug } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getOnboardingChecklist } from "@/lib/onboarding/checklist";
import { OnboardingChecklist } from "./onboarding-checklist";
import { EventsCard, type EventRow } from "./events-card";
import { EmptyState } from "./empty-state";

const TINTS: Record<string, string> = {
  orange: "bg-sky-50 text-sky-600",
  navy: "bg-slate-100 text-slate-700",
  green: "bg-green-50 text-green-600",
  red: "bg-red-50 text-red-600",
};

function startOfTodayIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function CardHeader({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <Link
        href={href}
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-sky-600"
      >
        {linkLabel}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
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
  const todayStart = startOfTodayIso();
  const canWrite = ["organization_owner", "organization_admin", "staff"].includes(
    membership.role
  );

  const [
    orgSettingsRes,
    webinarsRes,
    totalRegistrationsRes,
    todayRegistrationsRes,
    activeWebinarsRes,
    paidRegistrationsRes,
    pendingPaymentsRes,
    successfulPaymentsRes,
    attendanceRes,
  ] = await Promise.all([
    supabase.from("organizations").select("settings, timezone").eq("id", orgId).maybeSingle(),
    supabase
      .from("webinars")
      .select("id, name, status, start_time, end_time, event_date, speaker_name, recording_url")
      .eq("organization_id", orgId)
      .order("start_time", { ascending: false }),
    supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId),
    supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .gte("created_at", todayStart),
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

  const totalRegistrations = totalRegistrationsRes.count ?? 0;

  // Format dates on the server with the org's timezone so the client renders
  // the exact same string (a locale/timezone-dependent format computed in a
  // client component would hydrate-mismatch against the server render).
  const tz = orgSettingsRes.data?.timezone || "Asia/Kolkata";
  const dateFmt = new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: tz,
  });
  const timeFmt = new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  });
  const dayFmt = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: tz,
  });

  const webinars = webinarsRes.data ?? [];
  const todayDate = new Date().toISOString().slice(0, 10);
  const toRow = (w: (typeof webinars)[number]): EventRow => ({
    id: w.id,
    name: w.name,
    status: w.status,
    dateLabel: dateFmt.format(new Date(w.start_time)),
    timeLabel: w.end_time
      ? `${timeFmt.format(new Date(w.start_time))} – ${timeFmt.format(new Date(w.end_time))}`
      : timeFmt.format(new Date(w.start_time)),
    speaker: w.speaker_name,
  });
  const upcoming = webinars
    .filter((w) => w.event_date >= todayDate && w.status !== "cancelled")
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
    .map(toRow);
  const past = webinars.filter((w) => w.event_date < todayDate).map(toRow);
  const recordings = webinars.filter((w) => w.recording_url);

  const cards: {
    label: string;
    value: string | number;
    icon: LucideIcon;
    tint: keyof typeof TINTS;
  }[] = [
    { label: "Total registrations", value: totalRegistrations, icon: Users, tint: "orange" },
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
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Signed in as{" "}
          <span className="font-medium text-slate-700">{membership.role}</span> of
          this organization.
        </p>
      </div>

      {showChecklist && (
        <OnboardingChecklist orgSlug={orgSlug} items={checklistItems} />
      )}

      <EventsCard
        orgSlug={orgSlug}
        upcoming={upcoming}
        past={past}
        canWrite={canWrite}
      />

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardHeader
          title="Analytics"
          href={`/${orgSlug}/analytics`}
          linkLabel="View details"
        />
        {totalRegistrations === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No analytics to display"
            description="You don't have any registrations yet. Publish a form and share it to start collecting data."
            action={{ label: "Go to forms", href: `/${orgSlug}/forms` }}
          />
        ) : (
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-b-xl bg-slate-100 lg:grid-cols-4">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="bg-white p-4 sm:p-5">
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
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <CardHeader
          title="Recordings"
          href={`/${orgSlug}/webinars`}
          linkLabel="View all"
        />
        {recordings.length === 0 ? (
          <EmptyState
            icon={PlayCircle}
            title="No recordings yet"
            description="Add a recording link to a completed webinar and it will be listed here for your team."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {recordings.map((w) => (
              <div key={w.id} className="flex items-center gap-4 px-5 py-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <PlayCircle className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/${orgSlug}/webinars/${w.id}`}
                    className="block truncate text-sm font-semibold text-slate-900 hover:text-sky-600"
                  >
                    {w.name}
                  </Link>
                  <p className="text-xs text-slate-500">
                    {dayFmt.format(new Date(w.start_time))}
                  </p>
                </div>
                <a
                  href={w.recording_url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  Watch
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
