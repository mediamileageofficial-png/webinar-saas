"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteWebinarAction } from "./actions";

export function DeleteWebinarButton({
  orgSlug,
  webinarId,
}: {
  orgSlug: string;
  webinarId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("Delete this draft webinar? This cannot be undone.")) return;
          setError(null);
          startTransition(async () => {
            const result = await deleteWebinarAction(orgSlug, webinarId);
            if (result?.error) {
              setError(result.error);
            } else {
              router.refresh();
            }
          });
        }}
        className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60"
      >
        {pending ? "Deleting..." : "Delete"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
