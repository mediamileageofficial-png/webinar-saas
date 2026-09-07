"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { triggerVerificationAction } from "./actions";

export function VerifyButton({ orgSlug }: { orgSlug: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const router = useRouter();

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const result = await triggerVerificationAction(orgSlug);
            if (result.error) setMessage({ text: result.error, isError: true });
            else if (result.success) setMessage({ text: result.success, isError: false });
            router.refresh();
          });
        }}
        className="w-fit rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {pending ? "Verifying..." : "Run bank verification"}
      </button>
      {message && (
        <p className={`text-sm ${message.isError ? "text-red-600" : "text-emerald-700"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
