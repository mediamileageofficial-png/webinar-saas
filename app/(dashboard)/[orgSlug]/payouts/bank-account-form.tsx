"use client";

import { useActionState } from "react";
import { TextField } from "@/components/ui/text-field";
import { saveBankAccountAction, type PayoutAccountActionState } from "./actions";

const initialState: PayoutAccountActionState = {};

export function BankAccountForm({ orgSlug }: { orgSlug: string }) {
  const boundAction = saveBankAccountAction.bind(null, orgSlug);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="flex max-w-md flex-col gap-3">
      <TextField label="Account holder name" name="accountHolderName" type="text" required />
      <TextField
        label="Account number"
        name="accountNumber"
        type="text"
        required
        placeholder="Enter the full account number"
      />
      <TextField
        label="IFSC code"
        name="ifscCode"
        type="text"
        required
        placeholder="e.g. HDFC0000001"
        maxLength={11}
      />

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state.success && <p className="text-sm text-emerald-700">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save bank account"}
      </button>
    </form>
  );
}
