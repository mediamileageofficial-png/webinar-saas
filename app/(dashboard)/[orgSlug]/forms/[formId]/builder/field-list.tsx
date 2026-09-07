import { FieldRow, type FieldRowData } from "./field-row";
import { AddFieldForm } from "./add-field-form";

export function FieldList({
  orgSlug,
  formId,
  fields,
  formIsPublished,
}: {
  orgSlug: string;
  formId: string;
  fields: FieldRowData[];
  formIsPublished: boolean;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-900">Fields</h2>
      {fields.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400">
          No fields yet - add at least one below before publishing.
        </p>
      ) : (
        <ul className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-white">
          {fields.map((field, i) => (
            <FieldRow
              key={field.id}
              orgSlug={orgSlug}
              formId={formId}
              field={field}
              isFirst={i === 0}
              isLast={i === fields.length - 1}
              formIsPublished={formIsPublished}
            />
          ))}
        </ul>
      )}

      <AddFieldForm orgSlug={orgSlug} formId={formId} />
    </div>
  );
}
