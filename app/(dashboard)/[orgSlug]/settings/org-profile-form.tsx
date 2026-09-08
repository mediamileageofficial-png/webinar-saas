"use client";

import { useActionState } from "react";
import { TextField } from "@/components/ui/text-field";
import { updateOrganizationProfileAction, type SettingsActionState } from "./actions";

const initialState: SettingsActionState = {};

export function OrgProfileForm({
  orgSlug,
  defaults,
}: {
  orgSlug: string;
  defaults: {
    name: string;
    logoUrl?: string;
    contactEmail?: string;
    contactPhone?: string;
    timezone: string;
    brandColor?: string;
  };
}) {
  const boundAction = updateOrganizationProfileAction.bind(null, orgSlug);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <TextField label="Organization name" name="name" type="text" required defaultValue={defaults.name} />
      <TextField label="Logo URL" name="logoUrl" type="url" defaultValue={defaults.logoUrl} />
      <div className="grid grid-cols-2 gap-4">
        <TextField label="Contact email" name="contactEmail" type="email" defaultValue={defaults.contactEmail} />
        <TextField label="Contact phone" name="contactPhone" type="text" defaultValue={defaults.contactPhone} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <TextField
          label="Timezone"
          name="timezone"
          type="text"
          placeholder="Asia/Kolkata"
          required
          defaultValue={defaults.timezone}
        />
        <TextField
          label="Brand color"
          name="brandColor"
          type="text"
          placeholder="#0f172a"
          defaultValue={defaults.brandColor}
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-green-700">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}
