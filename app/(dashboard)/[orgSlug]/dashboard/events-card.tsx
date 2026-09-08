"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, Clock, Plus, MoreVertical, CalendarX2 } from "lucide-react";
import { EmptyState } from "./empty-state";

export type EventRow = {
  id: string;
  name: string;
  status: string;
  dateLabel: string;
  timeLabel: string;
  speaker: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  published: "bg-slate-100 text-slate-700",
  registration_open: "bg-green-50 text-green-700",
  registration_closed: "bg-amber-50 text-amber-700",
  completed: "bg-slate-100 text-slate-500",
  cancelled: "bg-red-50 text-red-600",
};

function EventItem({ orgSlug, ev }: { orgSlug: string; ev: EventRow }) {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-teal-400 text-lg font-bold text-white">
        {ev.name.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <span
          className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
            STATUS_STYLES[ev.status] ?? "bg-slate-100 text-slate-600"
          }`}
        >
          {ev.status.replace(/_/g, " ")}
        </span>
        <Link
          href={`/${orgSlug}/webinars/${ev.id}`}
          className="mt-1 block truncate text-base font-semibold text-slate-900 hover:text-sky-600"
        >
          {ev.name}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {ev.dateLabel}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {ev.timeLabel}
          </span>
          {ev.speaker && <span className="truncate">· {ev.speaker}</span>}
        </div>
      </div>
      <Link
        href={`/${orgSlug}/webinars/${ev.id}`}
        aria-label={`Open ${ev.name}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      >
        <MoreVertical className="h-4 w-4" />
      </Link>
    </div>
  );
}

export function EventsCard({
  orgSlug,
  upcoming,
  past,
  canWrite,
}: {
  orgSlug: string;
  upcoming: EventRow[];
  past: EventRow[];
  canWrite: boolean;
}) {
  const [tab, setTab] = useState<"upcoming" | "past">(
    upcoming.length === 0 && past.length > 0 ? "past" : "upcoming"
  );
  const rows = tab === "upcoming" ? upcoming : past;

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
        <div className="flex gap-1">
          {(["upcoming", "past"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? "bg-sky-500 text-white"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {t} events
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/${orgSlug}/webinars`}
            className="rounded-md px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:text-sky-600"
          >
            All webinars
          </Link>
          {canWrite && (
            <Link
              href={`/${orgSlug}/webinars/new`}
              className="inline-flex items-center gap-1.5 rounded-md bg-sky-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-sky-600"
            >
              <Plus className="h-4 w-4" />
              Schedule
            </Link>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={CalendarX2}
          title={`No ${tab} events`}
          description={
            tab === "upcoming"
              ? "Schedule a webinar and it will show up here."
              : "Webinars that have already taken place will appear here."
          }
          action={
            canWrite && tab === "upcoming"
              ? { label: "Schedule a webinar", href: `/${orgSlug}/webinars/new` }
              : undefined
          }
        />
      ) : (
        <div className="divide-y divide-slate-100">
          {rows.map((ev) => (
            <EventItem key={ev.id} orgSlug={orgSlug} ev={ev} />
          ))}
        </div>
      )}
    </section>
  );
}
