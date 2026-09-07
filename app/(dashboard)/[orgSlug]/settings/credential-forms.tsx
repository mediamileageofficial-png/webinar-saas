"use client";

import { useActionState } from "react";
import { TextField } from "@/components/ui/text-field";
import {
  saveCashfreeCredentialsAction,
  saveMsg91CredentialsAction,
  saveEmailCredentialsAction,
  type SettingsActionState,
} from "./actions";

const initialState: SettingsActionState = {};

function FormShell({
  action,
  children,
}: {
  action: (prevState: SettingsActionState, formData: FormData) => Promise<SettingsActionState>;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      {children}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-emerald-700">{state.success}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}

export function CashfreeCredentialsForm({ orgSlug }: { orgSlug: string }) {
  const boundAction = saveCashfreeCredentialsAction.bind(null, orgSlug);
  return (
    <FormShell action={boundAction}>
      <TextField label="App ID" name="appId" type="text" required />
      <TextField label="Secret key" name="secretKey" type="password" required />
      <TextField label="Webhook secret" name="webhookSecret" type="password" required />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700">Environment</label>
        <select
          name="env"
          defaultValue="sandbox"
          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          <option value="sandbox">Sandbox</option>
          <option value="production">Production</option>
        </select>
      </div>
    </FormShell>
  );
}

export function Msg91CredentialsForm({ orgSlug }: { orgSlug: string }) {
  const boundAction = saveMsg91CredentialsAction.bind(null, orgSlug);
  return (
    <FormShell action={boundAction}>
      <TextField label="Auth key" name="authKey" type="password" required />
      <TextField label="Sender ID (SMS)" name="senderId" type="text" />
      <TextField label="WhatsApp integrated number" name="integratedNumber" type="text" />
    </FormShell>
  );
}

export function EmailCredentialsForm({ orgSlug }: { orgSlug: string }) {
  const boundAction = saveEmailCredentialsAction.bind(null, orgSlug);
  return (
    <FormShell action={boundAction}>
      <TextField label="Resend API key" name="apiKey" type="password" required />
      <TextField label="From address" name="fromAddress" type="email" required placeholder="hello@youracademy.com" />
    </FormShell>
  );
}
