"use client";

import type { RenderableField } from "./field-preview";

const TEXT_LIKE_TYPES = new Set([
  "full_name",
  "first_name",
  "last_name",
  "email",
  "mobile",
  "city",
  "state",
  "country",
  "education",
  "text",
]);

export function FieldInput({
  field,
  value,
  onChange,
  error,
}: {
  field: RenderableField;
  value: string | string[] | undefined;
  onChange: (value: string | string[]) => void;
  error?: string;
}) {
  const stringValue = typeof value === "string" ? value : "";
  const arrayValue = Array.isArray(value) ? value : [];
  const inputClass =
    "rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500";

  return (
    <div className="flex flex-col gap-1.5">
      {field.field_type !== "consent" && (
        <label className="text-sm font-medium text-slate-700">
          {field.label}
          {field.is_required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}

      {TEXT_LIKE_TYPES.has(field.field_type) && (
        <input
          type={field.field_type === "email" ? "email" : "text"}
          placeholder={field.placeholder ?? undefined}
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          required={field.is_required}
          className={inputClass}
        />
      )}

      {field.field_type === "number" && (
        <input
          type="number"
          placeholder={field.placeholder ?? undefined}
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          required={field.is_required}
          className={inputClass}
        />
      )}

      {(field.field_type === "dob" || field.field_type === "date") && (
        <input
          type="date"
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          required={field.is_required}
          className={inputClass}
        />
      )}

      {field.field_type === "textarea" && (
        <textarea
          placeholder={field.placeholder ?? undefined}
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          required={field.is_required}
          rows={3}
          className={inputClass}
        />
      )}

      {field.field_type === "gender" && (
        <select
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          required={field.is_required}
          className={inputClass}
        >
          <option value="">Select...</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
      )}

      {field.field_type === "dropdown" && (
        <select
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          required={field.is_required}
          className={inputClass}
        >
          <option value="">Select...</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}

      {field.field_type === "radio" && (
        <div className="flex flex-col gap-1.5">
          {(field.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name={field.field_key}
                value={opt}
                checked={stringValue === opt}
                onChange={() => onChange(opt)}
              />
              {opt}
            </label>
          ))}
        </div>
      )}

      {field.field_type === "checkbox" && (
        <div className="flex flex-col gap-1.5">
          {(field.options ?? []).map((opt) => {
            const checked = arrayValue.includes(opt);
            return (
              <label key={opt} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...arrayValue, opt]
                      : arrayValue.filter((o) => o !== opt);
                    onChange(next);
                  }}
                />
                {opt}
              </label>
            );
          })}
        </div>
      )}

      {field.field_type === "consent" && (
        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={stringValue === "true"}
            onChange={(e) => onChange(e.target.checked ? "true" : "")}
            required={field.is_required}
            className="mt-0.5"
          />
          <span>
            {field.label}
            {field.is_required && <span className="ml-0.5 text-red-500">*</span>}
          </span>
        </label>
      )}

      {field.help_text && <p className="text-xs text-slate-400">{field.help_text}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
