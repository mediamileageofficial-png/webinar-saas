"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publishFormAction, unpublishFormAction, duplicateFormAction } from "../../actions";

export function PublishControls({
  orgSlug,
  formId,
  isPublished,
  publicSlug,
}: {
  orgSlug: string;
  formId: string;
  isPublished: boolean;
  publicSlug: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function run(fn: () => Promise<{ error?: string; newFormId?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result?.error) {
        setError(result.error);
      } else if (result?.newFormId) {
        router.push(`/${orgSlug}/forms/${result.newFormId}/builder`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {isPublished ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => unpublishFormAction(orgSlug, formId))}
            className="rounded-md border border-amber-200 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-60"
          >
            Unpublish
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => publishFormAction(orgSlug, formId))}
            className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
          >
            Publish
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => duplicateFormAction(orgSlug, formId))}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
        >
          Duplicate
        </button>
      </div>

      {isPublished && (
        <p className="text-xs text-slate-500">
          Live at <span className="font-mono">/f/{publicSlug}</span>
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
