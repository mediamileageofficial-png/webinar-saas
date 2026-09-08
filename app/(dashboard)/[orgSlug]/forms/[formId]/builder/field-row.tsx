"use client";

import { useActionState, useState, useTransition } from "react";
import { TextField } from "@/components/ui/text-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { OPTIONS_FIELD_TYPES, fieldTypes, type FieldType } from "@/lib/validation/schemas/form";
import {
  updateFormFieldAction,
  toggleFieldActiveAction,
  deleteFormFieldAction,
  moveFormFieldAction,
  type FieldActionState,
} from "./field-actions";

export interface FieldRowData {
  id: string;
  field_type: FieldType;
  field_key: string;
  label: string;
  placeholder: string | null;
  help_text: string | null;
  is_required: boolean;
  options: string[] | null;
  is_active: boolean;
}

const initialState: FieldActionState = {};

export function FieldRow({
  orgSlug,
  formId,
  field,
  isFirst,
  isLast,
  formIsPublished,
}: {
  orgSlug: string;
  formId: string;
  field: FieldRowData;
  isFirst: boolean;
  isLast: boolean;
  formIsPublished: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [rowError, setRowError] = useState<string | null>(null);
  const needsOptions = OPTIONS_FIELD_TYPES.includes(field.field_type);

  const boundUpdate = updateFormFieldAction.bind(null, orgSlug, formId, field.id);
  const [state, formAction, updatePending] = useActionState(boundUpdate, initialState);

  function run(fn: () => Promise<{ error?: string }>) {
    setRowError(null);
    startTransition(async () => {
      const result = await fn();
      if (result?.error) setRowError(result.error);
    });
  }

  if (editing) {
    return (
      <li className="border-b border-slate-100 p-4 last:border-b-0">
        <form action={formAction} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">Field type</label>
              <select
                name="fieldType"
                defaultValue={field.field_type}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                {fieldTypes.map((ft) => (
                  <option key={ft} value={ft}>
                    {ft}
                  </option>
                ))}
              </select>
            </div>
            <TextField label="Field key" name="fieldKey" type="text" defaultValue={field.field_key} required />
          </div>
          <TextField label="Label" name="label" type="text" defaultValue={field.label} required />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Placeholder" name="placeholder" type="text" defaultValue={field.placeholder ?? undefined} />
            <TextField label="Help text" name="helpText" type="text" defaultValue={field.help_text ?? undefined} />
          </div>
          {needsOptions && (
            <TextareaField
              label="Options (one per line)"
              name="optionsRaw"
              rows={3}
              defaultValue={(field.options ?? []).join("\n")}
            />
          )}
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="isRequired" defaultChecked={field.is_required} />
            Required
          </label>

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={updatePending}
              className="rounded-md bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-60"
            >
              {updatePending ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between gap-4 border-b border-slate-100 p-4 last:border-b-0">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-900">{field.label}</span>
          {field.is_required && (
            <span className="text-xs text-red-500">required</span>
          )}
          {!field.is_active && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              inactive
            </span>
          )}
        </div>
        <div className="mt-0.5 text-xs text-slate-400">
          {field.field_type} &middot; key: {field.field_key}
        </div>
        {rowError && <p className="mt-1 text-xs text-red-600">{rowError}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          disabled={pending || isFirst}
          onClick={() => run(() => moveFormFieldAction(orgSlug, formId, field.id, "up"))}
          className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-30"
          aria-label="Move up"
        >
          &uarr;
        </button>
        <button
          type="button"
          disabled={pending || isLast}
          onClick={() => run(() => moveFormFieldAction(orgSlug, formId, field.id, "down"))}
          className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-30"
          aria-label="Move down"
        >
          &darr;
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs font-medium text-slate-600 hover:underline"
        >
          Edit
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            run(() => toggleFieldActiveAction(orgSlug, formId, field.id, !field.is_active))
          }
          className="text-xs font-medium text-slate-600 hover:underline disabled:opacity-60"
        >
          {field.is_active ? "Deactivate" : "Activate"}
        </button>
        {!formIsPublished && (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm("Delete this field?")) return;
              run(() => deleteFormFieldAction(orgSlug, formId, field.id));
            }}
            className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60"
          >
            Delete
          </button>
        )}
      </div>
    </li>
  );
}
