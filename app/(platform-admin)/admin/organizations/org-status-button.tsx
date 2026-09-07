"use client";

import { useState, useTransition } from "react";
import { setOrganizationStatusAction } from "./actions";

export function OrgStatusButton({
  organizationId,
  status,
}: {
  organizationId: string;
  status: "active" | "suspended";
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const nextStatus = status === "active" ? "suspended" : "active";
  const label = status === "active" ? "Suspend" : "Activate";

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await setOrganizationStatusAction(
              organizationId,
              nextStatus
            );
            if (result?.error) setError(result.error);
          });
        }}
        className={
          status === "active"
            ? "rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
            : "rounded-md border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
        }
      >
        {pending ? "Working..." : label}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
