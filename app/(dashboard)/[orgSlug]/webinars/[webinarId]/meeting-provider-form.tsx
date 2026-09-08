"use client";

import { useActionState } from "react";
import { TextField } from "@/components/ui/text-field";
import { setMeetingProviderAction, type MeetingProviderActionState } from "./meeting-provider-actions";

const initialState: MeetingProviderActionState = {};

export function MeetingProviderForm({
  orgSlug,
  webinarId,
  currentProvider,
  currentMeetingId,
}: {
  orgSlug: string;
  webinarId: string;
  currentProvider: string | null;
  currentMeetingId: string | null;
}) {
  const boundAction = setMeetingProviderAction.bind(null, orgSlug, webinarId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700">Meeting provider</label>
        <select
          name="meetingProvider"
          defaultValue={currentProvider ?? ""}
          className="w-48 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        >
          <option value="">None (manual attendance)</option>
          <option value="zoom">Zoom</option>
          <option value="google_meet">Google Meet</option>
        </select>
      </div>
      <div className="w-64">
        <TextField
          label="Meeting ID"
          name="providerMeetingId"
          type="text"
          defaultValue={currentMeetingId ?? undefined}
          placeholder="Zoom meeting ID or Meet space name"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="h-[38px] rounded-md bg-orange-500 px-3 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save"}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="w-full text-sm text-green-700">{state.success}</p>}
    </form>
  );
}
