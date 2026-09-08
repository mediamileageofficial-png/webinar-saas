"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

declare global {
  interface Window {
    Cashfree?: (config: { mode: "sandbox" | "production" }) => {
      checkout: (options: { paymentSessionId: string; redirectTarget?: string }) => void;
    };
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load the payment SDK."));
    document.body.appendChild(script);
  });
}

export default function PayPage() {
  const params = useParams<{ registrationId: string }>();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const res = await fetch("/api/public/payments/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registrationId: params.registrationId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not start payment.");
        if (cancelled) return;

        // Cashfree's own hosted checkout handles all card/UPI/etc. entry -
        // we never see or touch payment instrument details ourselves.
        await loadScript("https://sdk.cashfree.com/js/v3/cashfree.js");
        if (cancelled) return;

        const cashfree = window.Cashfree?.({
          mode: data.cashfreeEnv === "production" ? "production" : "sandbox",
        });
        if (!cashfree) throw new Error("Payment SDK failed to load.");

        setStatus("ready");
        cashfree.checkout({ paymentSessionId: data.paymentSessionId, redirectTarget: "_self" });
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "Could not start payment.");
      }
    }

    start();
    return () => {
      cancelled = true;
    };
  }, [params.registrationId]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
        {status === "loading" && (
          <p className="text-sm text-slate-500">Preparing your payment...</p>
        )}
        {status === "ready" && (
          <p className="text-sm text-slate-500">Redirecting to secure checkout...</p>
        )}
        {status === "error" && (
          <>
            <p className="text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
