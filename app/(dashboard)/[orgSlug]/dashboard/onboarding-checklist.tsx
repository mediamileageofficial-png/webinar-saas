"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
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
  const allDone = completedCount === items.length;

  if (dismissed) return null;

  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Getting started ({completedCount}/{items.length})
          </h2>
          <div className="mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${(completedCount / items.length) * 100}%` }}
            />
          </div>
        </div>
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
            className="text-xs font-medium text-slate-500 hover:underline disabled:opacity-60"
          >
            Dismiss
          </button>
        )}
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 text-sm">
            <span
              className={
                item.complete
                  ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500 text-xs text-white"
                  : "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 text-xs text-transparent"
              }
            >
              &#10003;
            </span>
            {item.complete ? (
              <span className="text-slate-400 line-through">{item.label}</span>
            ) : (
              <Link
                href={item.href}
                className="font-medium text-slate-700 transition-colors hover:text-orange-600"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
