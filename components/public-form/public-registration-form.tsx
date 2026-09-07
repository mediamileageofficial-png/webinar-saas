"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FieldInput } from "./field-input";
import type { RenderableField } from "./field-preview";

type Status = "idle" | "submitting" | "success" | "duplicate" | "error";

function collectUtmParams(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const searchParams = new URLSearchParams(window.location.search);
  const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  const collected: Record<string, string> = {};
  utmKeys.forEach((key) => {
    const value = searchParams.get(key);
    if (value) collected[key] = value;
  });
  return collected;
}

export function PublicRegistrationForm({
  publicFormSlug,
  fields,
  submitButtonText,
}: {
  publicFormSlug: string;
  fields: RenderableField[];
  submitButtonText: string;
}) {
  const [values, setValues] = useState<Record<string, string | string[]>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  // Captured once via lazy initializer (not an effect + setState, which
  // triggers an avoidable extra render) - this feeds the "Lead Source /
  // Marketing Attribution" columns on the registrations table.
  const [utm] = useState<Record<string, string>>(collectUtmParams);
  const router = useRouter();

  function setValue(key: string, value: string | string[]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setFieldErrors({});
    setMessage(null);

    const honeypot = (document.getElementById("website") as HTMLInputElement | null)?.value;

    try {
      const res = await fetch(`/api/public/forms/${publicFormSlug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          values,
          utm,
          referrer: document.referrer || undefined,
          landingPage: window.location.href,
          website: honeypot,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        setMessage(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      if (data.duplicate) {
        if (data.requiresPayment && data.registrationId) {
          router.push(`/pay/${data.registrationId}`);
          return;
        }
        setStatus("duplicate");
        setMessage(data.message ?? "You've already registered.");
        return;
      }

      if (data.requiresPayment && data.registrationId) {
        router.push(`/pay/${data.registrationId}`);
        return;
      }

      setStatus("success");
      setMessage(data.successMessage || "You're registered!");

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (status === "success" || status === "duplicate") {
    return (
      <div
        className={
          status === "success"
            ? "rounded-md bg-emerald-50 p-4 text-sm text-emerald-800"
            : "rounded-md bg-amber-50 p-4 text-sm text-amber-800"
        }
        role="status"
      >
        {message}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Honeypot: hidden from real visitors via `hidden` + tabIndex=-1; bots
          that fill every input on the page trip this and are silently dropped
          server-side (see the submit route). */}
      <input
        type="text"
        id="website"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      {fields.map((field) => (
        <FieldInput
          key={field.id}
          field={field}
          value={values[field.field_key]}
          onChange={(v) => setValue(field.field_key, v)}
          error={fieldErrors[field.field_key]}
        />
      ))}

      {message && status === "error" && (
        <p className="text-sm text-red-600" role="alert">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {status === "submitting" ? "Submitting..." : submitButtonText}
      </button>
    </form>
  );
}
