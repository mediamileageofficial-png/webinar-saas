import Link from "next/link";
import { notFound } from "next/navigation";
import { getMembershipForOrgSlug } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { FieldPreview, type RenderableField } from "@/components/public-form/field-preview";

export default async function FormPreviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string; formId: string }>;
}) {
  const { orgSlug, formId } = await params;
  const membership = await getMembershipForOrgSlug(orgSlug);
  if (!membership) notFound();

  const supabase = await createClient();
  const { data: form, error } = await supabase
    .from("forms")
    .select("*")
    .eq("id", formId)
    .eq("organization_id", membership.organizationId)
    .maybeSingle();

  if (error || !form) notFound();

  const { data: fields } = await supabase
    .from("form_fields")
    .select("*")
    .eq("form_id", formId)
    .eq("organization_id", membership.organizationId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return (
    <div>
      <Link
        href={`/${orgSlug}/forms/${formId}/builder`}
        className="text-xs text-slate-400 hover:underline"
      >
        &larr; Back to builder
      </Link>

      <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
        Preview - this is how registrants will see it
      </p>

      <div className="mt-4 max-w-lg rounded-lg border border-slate-200 bg-white p-6">
        <h1 className="text-lg font-semibold text-slate-900">{form.name}</h1>
        {form.description && (
          <p className="mt-1 text-sm text-slate-500">{form.description}</p>
        )}
        {form.is_paid && (
          <p className="mt-2 text-sm font-medium text-slate-700">
            {form.currency} {form.price_amount} to register
          </p>
        )}

        <div className="mt-6 flex flex-col gap-4">
          {(fields as RenderableField[] | null)?.map((field) => (
            <FieldPreview key={field.id} field={field} />
          ))}
        </div>

        <button
          type="button"
          disabled
          className="mt-6 w-full rounded-md bg-orange-500 px-4 py-2 text-sm font-medium text-white opacity-60"
        >
          {form.submit_button_text}
        </button>
      </div>
    </div>
  );
}
