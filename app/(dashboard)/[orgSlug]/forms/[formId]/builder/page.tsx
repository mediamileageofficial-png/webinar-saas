import Link from "next/link";
import { notFound } from "next/navigation";
import { getMembershipForOrgSlug } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { FormSettingsForm } from "../../form-settings-form";
import { updateFormSettingsAction } from "../../actions";
import { FieldList } from "./field-list";
import { PublishControls } from "./publish-controls";
import type { FieldRowData } from "./field-row";

export default async function FormBuilderPage({
  params,
}: {
  params: Promise<{ orgSlug: string; formId: string }>;
}) {
  const { orgSlug, formId } = await params;
  const membership = await getMembershipForOrgSlug(orgSlug);
  if (!membership) notFound();

  const supabase = await createClient();

  const [{ data: form, error: formError }, { data: fields }, { data: webinars }] =
    await Promise.all([
      supabase
        .from("forms")
        .select("*")
        .eq("id", formId)
        .eq("organization_id", membership.organizationId)
        .maybeSingle(),
      supabase
        .from("form_fields")
        .select("*")
        .eq("form_id", formId)
        .eq("organization_id", membership.organizationId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("webinars")
        .select("id, name")
        .eq("organization_id", membership.organizationId)
        .order("start_time", { ascending: false }),
    ]);

  if (formError || !form) notFound();

  const canWrite = ["organization_owner", "organization_admin", "staff"].includes(
    membership.role
  );
  const canPublish = ["organization_owner", "organization_admin"].includes(membership.role);

  const boundUpdateSettings = updateFormSettingsAction.bind(null, orgSlug, formId);

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <Link
            href={`/${orgSlug}/forms`}
            className="text-xs text-slate-400 hover:underline"
          >
            &larr; All forms
          </Link>
          <h1 className="mt-1 text-lg font-semibold text-slate-900">{form.name}</h1>
        </div>
        {canPublish && (
          <PublishControls
            orgSlug={orgSlug}
            formId={form.id}
            isPublished={form.is_published}
            publicSlug={form.public_slug}
          />
        )}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="text-sm font-semibold text-slate-900">Settings</h2>
          {canWrite ? (
            <div className="mt-2">
              <FormSettingsForm
                action={boundUpdateSettings}
                submitLabel="Save settings"
                webinarOptions={webinars ?? []}
                defaults={{
                  name: form.name,
                  description: form.description ?? undefined,
                  successMessage: form.success_message ?? undefined,
                  redirectUrl: form.redirect_url ?? undefined,
                  submitButtonText: form.submit_button_text,
                  webinarId: form.webinar_id ?? undefined,
                  isPaid: form.is_paid,
                  priceAmount: form.price_amount ? String(form.price_amount) : undefined,
                  currency: form.currency,
                }}
              />
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-400">View-only access.</p>
          )}
        </section>

        <section>
          {canWrite ? (
            <FieldList
              orgSlug={orgSlug}
              formId={form.id}
              fields={(fields ?? []) as FieldRowData[]}
              formIsPublished={form.is_published}
            />
          ) : (
            <p className="text-sm text-slate-400">View-only access.</p>
          )}
        </section>
      </div>

      <div className="mt-8 flex gap-4">
        <Link
          href={`/${orgSlug}/forms/${form.id}/preview`}
          className="text-sm font-medium text-slate-600 hover:underline"
        >
          Preview this form &rarr;
        </Link>
        <Link
          href={`/${orgSlug}/forms/${form.id}/integrations`}
          className="text-sm font-medium text-slate-600 hover:underline"
        >
          Embed &amp; integrations &rarr;
        </Link>
      </div>
    </div>
  );
}
