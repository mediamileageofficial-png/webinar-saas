"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { syncAttendanceAction } from "./meeting-provider-actions";

export function SyncAttendanceButton({
  orgSlug,
  webinarId,
}: {
  orgSlug: string;
  webinarId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const router = useRouter();

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const result = await syncAttendanceAction(orgSlug, webinarId);
            if (result.error) setMessage({ text: result.error, isError: true });
            else if (result.success) setMessage({ text: result.success, isError: false });
            router.refresh();
          });
        }}
        className="w-fit rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
      >
        {pending ? "Syncing..." : "Sync attendance now"}
      </button>
      {message && (
        <p className={`text-sm ${message.isError ? "text-red-600" : "text-emerald-700"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
