"use client";

import { useActionState, useState } from "react";
import { TextField } from "@/components/ui/text-field";
import { automationTriggers } from "@/lib/automation/triggers";
import { messageChannels, templateKeys, TEMPLATE_KEY_LABELS } from "@/lib/validation/schemas/message-template";
import { createAutomationRuleAction, type AutomationRuleActionState } from "./actions";

const initialState: AutomationRuleActionState = {};

const TRIGGER_LABELS: Record<string, string> = {
  registration_created: "Registration created (handled automatically, no rule needed)",
  payment_success: "Payment successful (handled automatically, no rule needed)",
  before_webinar: "Before the webinar",
  after_webinar: "After the webinar",
  no_show: "Marked as no-show",
};

export function CreateAutomationRuleForm({
  orgSlug,
  webinarOptions,
}: {
  orgSlug: string;
  webinarOptions: { id: string; name: string }[];
}) {
  const boundAction = createAutomationRuleAction.bind(null, orgSlug);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [trigger, setTrigger] = useState<string>("before_webinar");
  const needsOffset = trigger === "before_webinar" || trigger === "after_webinar";

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-dashed border-slate-300 p-4">
      <h3 className="text-sm font-medium text-slate-700">New automation rule</h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Trigger</label>
          <select
            name="trigger"
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {automationTriggers
              .filter((t) => t === "before_webinar" || t === "after_webinar" || t === "no_show")
              .map((t) => (
                <option key={t} value={t}>
                  {TRIGGER_LABELS[t]}
                </option>
              ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Applies to</label>
          <select
            name="webinarId"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="">All webinars</option>
            {webinarOptions.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {needsOffset && (
        <TextField
          label={
            trigger === "before_webinar"
              ? "Minutes before the webinar (e.g. 1440 for 24h, 60 for 1h, 15 for 15min)"
              : "Minutes after the webinar ends"
          }
          name="offsetMinutes"
          type="number"
          min="1"
          required
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Channel</label>
          <select
            name="channel"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {messageChannels.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700">Template</label>
          <select
            name="templateKey"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {templateKeys.map((k) => (
              <option key={k} value={k}>
                {TEMPLATE_KEY_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-60"
      >
        {pending ? "Creating..." : "Create rule"}
      </button>
    </form>
  );
}
