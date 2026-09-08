"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, ArrowRight } from "lucide-react";
import { dismissOnboardingChecklistAction } from "./onboarding-actions";
import type { ChecklistItem } from "@/lib/onboarding/checklist";

export function OnboardingChecklist({
  orgSlug,
  items,
}: {
  orgSlug: string;
  items: ChecklistItem[];
}) {
  const [pending, startTransition] = useTransition();
  const [dismissed, setDismissed] = useState(false);
  const completedCount = items.filter((i) => i.complete).length;
  const pct = Math.round((completedCount / items.length) * 100);
  const allDone = completedCount === items.length;

  if (dismissed) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">
            Getting started
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {completedCount} of {items.length} complete
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold tabular-nums text-slate-900">
            {pct}%
          </span>
          {allDone && (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                startTransition(async () => {
                  await dismissOnboardingChecklistAction(orgSlug);
                  setDismissed(true);
                });
              }}
              className="text-xs font-medium text-slate-500 transition-colors hover:text-orange-600 disabled:opacity-60"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-orange-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="mt-4 flex flex-col divide-y divide-slate-100">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 py-2.5 text-sm">
            <span
              className={
                item.complete
                  ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500 text-white"
                  : "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300"
              }
            >
              {item.complete && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            {item.complete ? (
              <span className="text-slate-400 line-through">{item.label}</span>
            ) : (
              <Link
                href={item.href}
                className="group flex flex-1 items-center justify-between font-medium text-slate-700 transition-colors hover:text-orange-600"
              >
                {item.label}
                <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
