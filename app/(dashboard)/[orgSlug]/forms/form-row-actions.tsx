"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  duplicateFormAction,
  publishFormAction,
  unpublishFormAction,
  deleteFormAction,
} from "./actions";

export function FormRowActions({
  orgSlug,
  formId,
  isPublished,
}: {
  orgSlug: string;
  formId: string;
  isPublished: boolean;
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
      <div className="flex flex-wrap justify-end gap-2">
        {isPublished ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => unpublishFormAction(orgSlug, formId))}
            className="text-xs font-medium text-amber-600 hover:underline disabled:opacity-60"
          >
            Unpublish
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => publishFormAction(orgSlug, formId))}
            className="text-xs font-medium text-green-700 hover:underline disabled:opacity-60"
          >
            Publish
          </button>
        )}
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => duplicateFormAction(orgSlug, formId))}
          className="text-xs font-medium text-slate-600 hover:underline disabled:opacity-60"
        >
          Duplicate
        </button>
        {!isPublished && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm("Delete this form? This cannot be undone.")) return;
              run(() => deleteFormAction(orgSlug, formId));
            }}
            className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60"
          >
            Delete
          </button>
        )}
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
