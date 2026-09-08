"use client";

import { useActionState } from "react";
import { TextField } from "@/components/ui/text-field";
import { createPayoutRequestAction, type PayoutRequestActionState } from "./actions";

const initialState: PayoutRequestActionState = {};

export function CreateRequestForm({
  organizations,
}: {
  organizations: { id: string; name: string; slug: string }[];
}) {
  const [state, formAction, pending] = useActionState(createPayoutRequestAction, initialState);

  return (
    <form
      action={formAction}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4"
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700">Organization</label>
        <select
          name="organizationId"
          required
          className="w-56 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          <option value="">Select...</option>
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
      <div className="w-40">
        <TextField label="Amount (INR)" name="amount" type="number" min="1" step="0.01" required />
      </div>
      <div className="w-64">
        <TextField label="Notes (optional)" name="notes" type="text" />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="h-[38px] rounded-md bg-sky-500 px-3 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-60"
      >
        {pending ? "Creating..." : "Create payout request"}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="w-full text-sm text-green-700">{state.success}</p>}
    </form>
  );
}
