"use client";

import { useState, useTransition } from "react";
import { changeWebinarStatusAction } from "./actions";
import {
  WEBINAR_STATUS_TRANSITIONS,
  type WebinarStatus,
} from "@/lib/validation/schemas/webinar";

const STATUS_LABELS: Record<WebinarStatus, string> = {
  draft: "Draft",
  published: "Published",
  registration_open: "Registration open",
  registration_closed: "Registration closed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function WebinarStatusControls({
  orgSlug,
  webinarId,
  status,
}: {
  orgSlug: string;
  webinarId: string;
  status: WebinarStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const nextOptions = WEBINAR_STATUS_TRANSITIONS[status];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">Current status:</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          {STATUS_LABELS[status]}
        </span>
      </div>

      {nextOptions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {nextOptions.map((next) => (
            <button
              key={next}
              type="button"
              disabled={pending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const result = await changeWebinarStatusAction(
                    orgSlug,
                    webinarId,
                    status,
                    next
                  );
                  if (result?.error) setError(result.error);
                });
              }}
              className={
                next === "cancelled"
                  ? "rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                  : "rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              }
            >
              {pending ? "Working..." : `Move to ${STATUS_LABELS[next]}`}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
