"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAttendanceAction } from "./attendance-actions";

export function AttendanceButtons({
  orgSlug,
  webinarId,
  registrationId,
  currentlyAttended,
}: {
  orgSlug: string;
  webinarId: string;
  registrationId: string;
  currentlyAttended: boolean | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function mark(attended: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await markAttendanceAction(orgSlug, webinarId, registrationId, attended);
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => mark(true)}
          className={
            currentlyAttended === true
              ? "rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white"
              : "rounded-md border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
          }
        >
          Attended
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => mark(false)}
          className={
            currentlyAttended === false
              ? "rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white"
              : "rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
          }
        >
          No-show
        </button>
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
