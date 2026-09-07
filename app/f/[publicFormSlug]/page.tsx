import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicRegistrationForm } from "@/components/public-form/public-registration-form";
import type { RenderableField } from "@/components/public-form/field-preview";

interface PublicFormRow {
  id: string;
  name: string;
  description: string | null;
  submit_button_text: string;
  is_paid: boolean;
  price_amount: number | null;
  currency: string;
}

async function fetchPublishedForm(
  publicFormSlug: string
): Promise<{ form: PublicFormRow; fields: RenderableField[] } | null> {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("forms")
      .select("id, name, description, submit_button_text, is_paid, price_amount, currency")
      .eq("public_slug", publicFormSlug)
      .eq("is_published", true)
      .maybeSingle();

    if (error || !data) return null;

    const { data: fieldRows } = await supabase
      .from("form_fields")
      .select("id, field_type, field_key, label, placeholder, help_text, is_required, options")
      .eq("form_id", data.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    return { form: data as PublicFormRow, fields: (fieldRows ?? []) as RenderableField[] };
  } catch {
    // A connection/config failure looks the same as "not found" to a public
    // visitor - never surface a raw error/stack trace here. Returning null
    // (rather than calling notFound() from inside this try/catch) keeps
    // Next.js's own not-found signaling untouched by our error handling.
    return null;
  }
}

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ publicFormSlug: string }>;
}) {
  const { publicFormSlug } = await params;
  const result = await fetchPublishedForm(publicFormSlug);

  if (!result) {
    notFound();
  }
  const { form, fields } = result;

  // Best-effort view counter for the form's conversion-rate analytics.
  // Deliberately fire-and-forget-safe: wrapped so a DB hiccup here can never
  // break the page for the visitor trying to register.
  try {
    const supabase = createAdminClient();
    await supabase.rpc("increment_form_view_count", { target_form_id: form.id });
  } catch {
    // Non-fatal - a missed view count is not worth failing the page over.
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">{form.name}</h1>
        {form.description && (
          <p className="mt-1 text-sm text-slate-500">{form.description}</p>
        )}
        {form.is_paid && (
          <p className="mt-2 text-sm font-medium text-slate-700">
            {form.currency} {form.price_amount} to register
          </p>
        )}

        <div className="mt-6">
          <PublicRegistrationForm
            publicFormSlug={publicFormSlug}
            fields={fields}
            submitButtonText={form.submit_button_text}
          />
        </div>
      </div>
    </div>
  );
}
