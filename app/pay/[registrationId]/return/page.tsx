"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type PollState = "checking" | "confirmed" | "failed" | "pending";

const MAX_ATTEMPTS = 8;
const POLL_INTERVAL_MS = 2000;

export default function PaymentReturnPage() {
  const params = useParams<{ registrationId: string }>();
  const [state, setState] = useState<PollState>("checking");

  useEffect(() => {
    let attempts = 0;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      attempts += 1;
      try {
        const res = await fetch(`/api/public/registrations/${params.registrationId}/status`);
        const data = await res.json();
        if (cancelled) return;

        // The redirect back from Cashfree (this page even loading) is NOT
        // treated as proof of payment - only our own DB, which only the
        // signature-verified webhook is allowed to write "confirmed" into.
        if (data.status === "confirmed") {
          setState("confirmed");
          return;
        }
        if (data.paymentStatus === "failed" || data.paymentStatus === "cancelled") {
          setState("failed");
          return;
        }
      } catch {
        // Transient network error - keep polling until the attempt budget runs out.
      }

      if (attempts < MAX_ATTEMPTS && !cancelled) {
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      } else if (!cancelled) {
        setState("pending");
      }
    }

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [params.registrationId]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        {state === "checking" && (
          <p className="text-sm text-slate-500">Confirming your payment...</p>
        )}
        {state === "confirmed" && (
          <p className="text-sm text-emerald-700">
            Payment successful - you&apos;re registered!
          </p>
        )}
        {state === "failed" && (
          <p className="text-sm text-red-600">
            Payment didn&apos;t go through. You can try again from the registration link.
          </p>
        )}
        {state === "pending" && (
          <p className="text-sm text-amber-700">
            We&apos;re still confirming your payment with the bank. You&apos;ll be
            confirmed automatically once it clears - no need to pay again.
          </p>
        )}
      </div>
    </div>
  );
}
