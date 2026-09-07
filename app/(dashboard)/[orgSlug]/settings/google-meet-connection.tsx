"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { disconnectGoogleMeetAction } from "./actions";

export function GoogleMeetConnection({
  orgSlug,
  connected,
  updatedAt,
}: {
  orgSlug: string;
  connected: boolean;
  updatedAt: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-900">Google Meet</h3>
          <p className="mt-1 text-xs text-slate-500">
            Attendance for signed-in participants can only be matched if the
            connected Google account has Workspace admin directory access -
            anonymous guests and most personal-account participants will
            still need manual attendance marking.
          </p>
        </div>
        {connected ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            Connected{updatedAt ? ` - ${new Date(updatedAt).toLocaleDateString()}` : ""}
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
            Not connected
          </span>
        )}
      </div>

      <div className="mt-3">
        {connected ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await disconnectGoogleMeetAction(orgSlug);
                if (result.error) setError(result.error);
                router.refresh();
              });
            }}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            {pending ? "Disconnecting..." : "Disconnect"}
          </button>
        ) : (
          <a
            href={`/api/integrations/google-meet/connect?orgSlug=${encodeURIComponent(orgSlug)}`}
            className="inline-block rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            Connect Google account
          </a>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
