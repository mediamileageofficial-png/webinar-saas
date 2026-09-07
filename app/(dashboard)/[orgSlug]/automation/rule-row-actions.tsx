"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleAutomationRuleAction, deleteAutomationRuleAction } from "./actions";

export function RuleRowActions({
  orgSlug,
  ruleId,
  isActive,
}: {
  orgSlug: string;
  ruleId: string;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => toggleAutomationRuleAction(orgSlug, ruleId, !isActive))}
          className="text-xs font-medium text-slate-600 hover:underline disabled:opacity-60"
        >
          {isActive ? "Pause" : "Resume"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm("Delete this automation rule?")) return;
            run(() => deleteAutomationRuleAction(orgSlug, ruleId));
          }}
          className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60"
        >
          Delete
        </button>
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
