"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approvePayoutRequestAction,
  rejectPayoutRequestAction,
  initiatePayoutAction,
} from "./actions";

export function RequestRowActions({
  requestId,
  status,
  verificationStatus,
}: {
  requestId: string;
  status: string;
  verificationStatus: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  function run(fn: () => Promise<{ error?: string; success?: string }>) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await fn();
      if (result?.error) setError(result.error);
      if (result?.success) setSuccess(result.success);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {status === "pending" && (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => approvePayoutRequestAction(requestId))}
              className="text-xs font-medium text-green-700 hover:underline disabled:opacity-60"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => rejectPayoutRequestAction(requestId))}
              className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60"
            >
              Reject
            </button>
          </>
        )}
        {(status === "approved" || status === "failed") && (
          <button
            type="button"
            disabled={pending || verificationStatus !== "VERIFIED"}
            title={
              verificationStatus !== "VERIFIED"
                ? `Blocked: bank account is ${verificationStatus}, not VERIFIED`
                : undefined
            }
            onClick={() => run(() => initiatePayoutAction(requestId))}
            className="text-xs font-medium text-slate-900 underline hover:no-underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
          >
            {status === "failed" ? "Retry transfer" : "Initiate transfer"}
          </button>
        )}
      </div>
      {error && <span className="max-w-xs text-right text-xs text-red-600">{error}</span>}
      {success && <span className="max-w-xs text-right text-xs text-green-700">{success}</span>}
    </div>
  );
}
