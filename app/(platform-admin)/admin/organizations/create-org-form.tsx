"use client";

import { useActionState, useState } from "react";
import { TextField } from "@/components/ui/text-field";
import { slugify } from "@/lib/validation/schemas/organization";
import { createOrganizationAsAdminAction, type AdminActionState } from "./actions";

const initialState: AdminActionState = {};

export function CreateOrgForm() {
  const [state, formAction, pending] = useActionState(
    createOrganizationAsAdminAction,
    initialState
  );
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4"
    >
      <div className="w-56">
        <TextField
          label="Organization name"
          name="name"
          type="text"
          placeholder="Acme Coaching Institute"
          required
          onChange={(e) => {
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
        />
      </div>
      <div className="w-56">
        <TextField
          label="Slug"
          name="slug"
          type="text"
          placeholder="acme-coaching"
          required
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(slugify(e.target.value));
          }}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="h-[38px] rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "Creating..." : "Create organization"}
      </button>
      {state.error && (
        <p className="w-full text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
