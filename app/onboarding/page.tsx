"use client";

import { useActionState, useState } from "react";
import { TextField } from "@/components/ui/text-field";
import { Wordmark } from "@/components/brand/wordmark";
import { BrandBackdrop } from "@/components/brand/brand-backdrop";
import { slugify } from "@/lib/validation/schemas/organization";
import { createOrganizationAction, type CreateOrgActionState } from "./actions";

const initialState: CreateOrgActionState = {};

export default function OnboardingPage() {
  const [state, formAction, pending] = useActionState(
    createOrganizationAction,
    initialState
  );
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <BrandBackdrop />
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <Wordmark className="mb-6" />
        <h1 className="text-xl font-semibold text-slate-900">
          Create your organization
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          This is your workspace for webinars, forms, and registrations. You
          can invite teammates later.
        </p>

        <form action={formAction} className="mt-6 flex flex-col gap-4">
          <TextField
            label="Organization name"
            name="name"
            type="text"
            placeholder="Demo IAS Academy"
            required
            onChange={(e) => {
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
          />
          <div>
            <TextField
              label="Public URL"
              name="slug"
              type="text"
              placeholder="demo-ias-academy"
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
            />
            <p className="mt-1 text-xs text-slate-400">
              yourapp.com/{slug || "your-org"}/dashboard
            </p>
          </div>

          {state.error && (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {pending ? "Creating..." : "Create organization"}
          </button>
        </form>
      </div>
    </div>
  );
}
