"use client";

import { useActionState, useState } from "react";
import { TextField } from "@/components/ui/text-field";
import { TextareaField } from "@/components/ui/textarea-field";
import { fieldTypes, OPTIONS_FIELD_TYPES, type FieldType } from "@/lib/validation/schemas/form";
import { slugify } from "@/lib/utils/slugify";
import { addFormFieldAction, type FieldActionState } from "./field-actions";

const initialState: FieldActionState = {};

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  full_name: "Full name",
  first_name: "First name",
  last_name: "Last name",
  email: "Email",
  mobile: "Mobile number",
  dob: "Date of birth",
  gender: "Gender",
  city: "City",
  state: "State",
  country: "Country",
  education: "Education",
  text: "Text",
  textarea: "Long text",
  number: "Number",
  dropdown: "Dropdown",
  radio: "Radio buttons",
  checkbox: "Checkboxes",
  date: "Date",
  consent: "Consent checkbox",
};

export function AddFieldForm({
  orgSlug,
  formId,
}: {
  orgSlug: string;
  formId: string;
}) {
  const boundAction = addFormFieldAction.bind(null, orgSlug, formId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [fieldType, setFieldType] = useState<FieldType>("text");
  const [fieldKey, setFieldKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const needsOptions = OPTIONS_FIELD_TYPES.includes(fieldType);

  return (
    <form
      action={formAction}
      className="mt-4 flex flex-col gap-3 rounded-lg border border-dashed border-slate-300 p-4"
    >
      <h3 className="text-sm font-medium text-slate-700">Add a field</h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fieldType" className="text-sm font-medium text-slate-700">
            Field type
          </label>
          <select
            id="fieldType"
            name="fieldType"
            value={fieldType}
            onChange={(e) => {
              const next = e.target.value as FieldType;
              setFieldType(next);
              if (!keyTouched) setFieldKey(next);
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            {fieldTypes.map((ft) => (
              <option key={ft} value={ft}>
                {FIELD_TYPE_LABELS[ft]}
              </option>
            ))}
          </select>
        </div>

        <TextField
          label="Field key"
          name="fieldKey"
          type="text"
          required
          value={fieldKey}
          onChange={(e) => {
            setKeyTouched(true);
            setFieldKey(slugify(e.target.value).replace(/-/g, "_"));
          }}
        />
      </div>

      <TextField label="Label" name="label" type="text" required />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Placeholder (optional)" name="placeholder" type="text" />
        <TextField label="Help text (optional)" name="helpText" type="text" />
      </div>

      {needsOptions && (
        <TextareaField
          label="Options (one per line)"
          name="optionsRaw"
          rows={3}
          placeholder={"Option A\nOption B\nOption C"}
        />
      )}

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="isRequired" />
        Required
      </label>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-md bg-orange-500 px-3 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60"
      >
        {pending ? "Adding..." : "Add field"}
      </button>
    </form>
  );
}
