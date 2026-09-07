export interface RenderableField {
  id: string;
  field_type: string;
  field_key: string;
  label: string;
  placeholder: string | null;
  help_text: string | null;
  is_required: boolean;
  options: string[] | null;
}

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

/**
 * Renders a single field for preview/disabled display. This intentionally
 * matches the markup the real public form (Phase 6) will use, so the builder
 * preview is an honest representation of what registrants will see.
 */
export function FieldPreview({ field }: { field: RenderableField }) {
  const commonLabel = (
    <label className="text-sm font-medium text-slate-700">
      {field.label}
      {field.is_required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );

  return (
    <div className="flex flex-col gap-1.5">
      {field.field_type !== "consent" && commonLabel}

      {TEXT_LIKE_TYPES.has(field.field_type) && (
        <input
          type={field.field_type === "email" ? "email" : "text"}
          placeholder={field.placeholder ?? undefined}
          disabled
          className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500"
        />
      )}

      {field.field_type === "number" && (
        <input
          type="number"
          placeholder={field.placeholder ?? undefined}
          disabled
          className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500"
        />
      )}

      {(field.field_type === "dob" || field.field_type === "date") && (
        <input
          type="date"
          disabled
          className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500"
        />
      )}

      {field.field_type === "textarea" && (
        <textarea
          placeholder={field.placeholder ?? undefined}
          disabled
          rows={3}
          className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500"
        />
      )}

      {field.field_type === "gender" && (
        <select disabled className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">
          <option>Male</option>
          <option>Female</option>
          <option>Other</option>
        </select>
      )}

      {field.field_type === "dropdown" && (
        <select disabled className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">
          {(field.options ?? []).map((opt) => (
            <option key={opt}>{opt}</option>
          ))}
        </select>
      )}

      {field.field_type === "radio" && (
        <div className="flex flex-col gap-1.5">
          {(field.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm text-slate-500">
              <input type="radio" disabled name={field.field_key} />
              {opt}
            </label>
          ))}
        </div>
      )}

      {field.field_type === "checkbox" && (
        <div className="flex flex-col gap-1.5">
          {(field.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm text-slate-500">
              <input type="checkbox" disabled />
              {opt}
            </label>
          ))}
        </div>
      )}

      {field.field_type === "consent" && (
        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input type="checkbox" disabled className="mt-0.5" />
          <span>
            {field.label}
            {field.is_required && <span className="ml-0.5 text-red-500">*</span>}
          </span>
        </label>
      )}

      {field.help_text && (
        <p className="text-xs text-slate-400">{field.help_text}</p>
      )}
    </div>
  );
}
