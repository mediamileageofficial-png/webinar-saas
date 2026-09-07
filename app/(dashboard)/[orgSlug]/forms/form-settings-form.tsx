"use client";

import { useActionState, useState } from "react";
import { TextField } from "@/components/ui/text-field";
import { TextareaField } from "@/components/ui/textarea-field";
import type { FormActionState } from "./actions";

const initialState: FormActionState = {};

export interface FormSettingsDefaults {
  name?: string;
  description?: string;
  successMessage?: string;
  redirectUrl?: string;
  submitButtonText?: string;
  webinarId?: string;
  isPaid?: boolean;
  priceAmount?: string;
  currency?: string;
}

export interface WebinarOption {
  id: string;
  name: string;
}

export function FormSettingsForm({
  action,
  defaults,
  submitLabel,
  webinarOptions,
}: {
  action: (
    prevState: FormActionState,
    formData: FormData
  ) => Promise<FormActionState>;
  defaults?: FormSettingsDefaults;
  submitLabel: string;
  webinarOptions: WebinarOption[];
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [isPaid, setIsPaid] = useState(defaults?.isPaid ?? false);

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <TextField
        label="Form name"
        name="name"
        type="text"
        required
        defaultValue={defaults?.name}
      />
      <TextareaField
        label="Description"
        name="description"
        rows={2}
        defaultValue={defaults?.description}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="webinarId" className="text-sm font-medium text-slate-700">
          Linked webinar (optional)
        </label>
        <select
          id="webinarId"
          name="webinarId"
          defaultValue={defaults?.webinarId ?? ""}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          <option value="">None</option>
          {webinarOptions.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <TextField
          label="Success message"
          name="successMessage"
          type="text"
          placeholder="Thanks for registering!"
          defaultValue={defaults?.successMessage}
        />
        <TextField
          label="Redirect URL (optional)"
          name="redirectUrl"
          type="url"
          placeholder="https://..."
          defaultValue={defaults?.redirectUrl}
        />
      </div>

      <TextField
        label="Submit button text"
        name="submitButtonText"
        type="text"
        defaultValue={defaults?.submitButtonText ?? "Register"}
      />

      <div className="rounded-md border border-slate-200 p-3">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            name="isPaid"
            defaultChecked={defaults?.isPaid}
            onChange={(e) => setIsPaid(e.target.checked)}
          />
          This is a paid registration
        </label>

        {isPaid && (
          <div className="mt-3 grid grid-cols-2 gap-4">
            <TextField
              label="Price"
              name="priceAmount"
              type="number"
              min="1"
              step="0.01"
              defaultValue={defaults?.priceAmount}
              required={isPaid}
            />
            <TextField
              label="Currency"
              name="currency"
              type="text"
              defaultValue={defaults?.currency ?? "INR"}
              maxLength={3}
            />
          </div>
        )}
      </div>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-fit rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
