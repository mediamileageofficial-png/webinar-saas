"use client";

import { useActionState } from "react";
import { TextField } from "@/components/ui/text-field";
import { TextareaField } from "@/components/ui/textarea-field";
import type { WebinarActionState } from "./actions";

const initialState: WebinarActionState = {};

export interface WebinarFormDefaults {
  name?: string;
  description?: string;
  eventDate?: string;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  speakerName?: string;
  speakerDetails?: string;
  platform?: string;
  joinUrl?: string;
  recordingUrl?: string;
}

export function WebinarForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (
    prevState: WebinarActionState,
    formData: FormData
  ) => Promise<WebinarActionState>;
  defaults?: WebinarFormDefaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <TextField
        label="Webinar name"
        name="name"
        type="text"
        required
        defaultValue={defaults?.name}
      />
      <TextareaField
        label="Description"
        name="description"
        rows={3}
        defaultValue={defaults?.description}
      />

      <div className="grid grid-cols-2 gap-4">
        <TextField
          label="Event date"
          name="eventDate"
          type="date"
          required
          defaultValue={defaults?.eventDate}
        />
        <TextField
          label="Timezone"
          name="timezone"
          type="text"
          placeholder="Asia/Kolkata"
          defaultValue={defaults?.timezone ?? "Asia/Kolkata"}
        />
        <TextField
          label="Start time"
          name="startTime"
          type="datetime-local"
          required
          defaultValue={defaults?.startTime}
        />
        <TextField
          label="End time"
          name="endTime"
          type="datetime-local"
          required
          defaultValue={defaults?.endTime}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TextField
          label="Speaker name"
          name="speakerName"
          type="text"
          defaultValue={defaults?.speakerName}
        />
        <TextField
          label="Platform"
          name="platform"
          type="text"
          placeholder="Zoom, Google Meet, YouTube..."
          defaultValue={defaults?.platform}
        />
      </div>
      <TextareaField
        label="Speaker details"
        name="speakerDetails"
        rows={2}
        defaultValue={defaults?.speakerDetails}
      />

      <div className="grid grid-cols-2 gap-4">
        <TextField
          label="Join URL"
          name="joinUrl"
          type="url"
          placeholder="https://..."
          defaultValue={defaults?.joinUrl}
        />
        <TextField
          label="Recording URL"
          name="recordingUrl"
          type="url"
          placeholder="https://..."
          defaultValue={defaults?.recordingUrl}
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-fit rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-60"
      >
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
