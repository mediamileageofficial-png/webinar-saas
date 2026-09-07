"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/auth/guards";
import { formSettingsSchema } from "@/lib/validation/schemas/form";
import { slugify, randomSlugSuffix } from "@/lib/utils/slugify";

export interface FormActionState {
  error?: string;
}

const WRITE_ROLES = ["organization_owner", "organization_admin", "staff"] as const;
const PUBLISH_ROLES = ["organization_owner", "organization_admin"] as const;
const DELETE_ROLES = ["organization_owner", "organization_admin"] as const;

function parseFormSettings(formData: FormData) {
  return formSettingsSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    successMessage: formData.get("successMessage"),
    redirectUrl: formData.get("redirectUrl"),
    submitButtonText: formData.get("submitButtonText") || "Register",
    webinarId: formData.get("webinarId"),
    isPaid: formData.get("isPaid") === "on",
    priceAmount: formData.get("priceAmount")?.toString(),
    currency: formData.get("currency") || "INR",
  });
}

/** Generates a public slug and retries on collision - the DB unique index is the real guard. */
async function insertFormWithUniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  row: Record<string, unknown>,
  baseName: string
) {
  const base = slugify(baseName) || "form";
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${randomSlugSuffix(4)}`;
    const { data, error } = await supabase
      .from("forms")
      .insert({ ...row, public_slug: slug })
      .select("id")
      .single();

    if (!error) return { data, error: null };
    if (!error.message.includes("duplicate key")) return { data: null, error };
    // else: slug collision, loop and try another suffix
  }
  return { data: null, error: { message: "Could not generate a unique form URL. Try again." } };
}

export async function createFormAction(
  orgSlug: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const membership = await requireOrgRole(orgSlug, [...WRITE_ROLES]);

  const parsed = parseFormSettings(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const { data: inserted, error } = await insertFormWithUniqueSlug(
    supabase,
    {
      organization_id: membership.organizationId,
      name: data.name,
      description: data.description ?? null,
      success_message: data.successMessage ?? null,
      redirect_url: data.redirectUrl ?? null,
      submit_button_text: data.submitButtonText,
      webinar_id: data.webinarId ?? null,
      is_paid: data.isPaid,
      price_amount: data.isPaid ? Number(data.priceAmount) : null,
      currency: data.currency,
      is_published: false,
    },
    data.name
  );

  if (error || !inserted) {
    return { error: "Could not create the form. Please try again." };
  }

  redirect(`/${orgSlug}/forms/${inserted.id}/builder`);
}

export async function updateFormSettingsAction(
  orgSlug: string,
  formId: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const membership = await requireOrgRole(orgSlug, [...WRITE_ROLES]);

  const parsed = parseFormSettings(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("forms")
    .update({
      name: data.name,
      description: data.description ?? null,
      success_message: data.successMessage ?? null,
      redirect_url: data.redirectUrl ?? null,
      submit_button_text: data.submitButtonText,
      webinar_id: data.webinarId ?? null,
      is_paid: data.isPaid,
      price_amount: data.isPaid ? Number(data.priceAmount) : null,
      currency: data.currency,
    })
    .eq("id", formId)
    .eq("organization_id", membership.organizationId);

  if (error) {
    return {
      error: data.isPaid
        ? "Could not save settings. Make sure the price is greater than 0."
        : "Could not save settings.",
    };
  }

  revalidatePath(`/${orgSlug}/forms/${formId}/builder`);
  return {};
}

export async function publishFormAction(
  orgSlug: string,
  formId: string
): Promise<{ error?: string }> {
  const membership = await requireOrgRole(orgSlug, [...PUBLISH_ROLES]);
  const supabase = await createClient();

  const { count } = await supabase
    .from("form_fields")
    .select("*", { count: "exact", head: true })
    .eq("form_id", formId)
    .eq("organization_id", membership.organizationId)
    .eq("is_active", true);

  if (!count) {
    return { error: "Add at least one field before publishing." };
  }

  const { error } = await supabase
    .from("forms")
    .update({ is_published: true })
    .eq("id", formId)
    .eq("organization_id", membership.organizationId);

  if (error) return { error: "Could not publish the form." };

  revalidatePath(`/${orgSlug}/forms`);
  revalidatePath(`/${orgSlug}/forms/${formId}/builder`);
  return {};
}

export async function unpublishFormAction(
  orgSlug: string,
  formId: string
): Promise<{ error?: string }> {
  const membership = await requireOrgRole(orgSlug, [...PUBLISH_ROLES]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("forms")
    .update({ is_published: false })
    .eq("id", formId)
    .eq("organization_id", membership.organizationId);

  if (error) return { error: "Could not unpublish the form." };

  revalidatePath(`/${orgSlug}/forms`);
  revalidatePath(`/${orgSlug}/forms/${formId}/builder`);
  return {};
}

export async function duplicateFormAction(
  orgSlug: string,
  formId: string
): Promise<{ error?: string; newFormId?: string }> {
  const membership = await requireOrgRole(orgSlug, [...WRITE_ROLES]);
  const supabase = await createClient();

  const { data: original, error: fetchError } = await supabase
    .from("forms")
    .select("*")
    .eq("id", formId)
    .eq("organization_id", membership.organizationId)
    .maybeSingle();

  if (fetchError || !original) {
    return { error: "Could not find that form." };
  }

  const { data: fields } = await supabase
    .from("form_fields")
    .select("*")
    .eq("form_id", formId)
    .eq("organization_id", membership.organizationId)
    .order("sort_order", { ascending: true });

  const { data: inserted, error } = await insertFormWithUniqueSlug(
    supabase,
    {
      organization_id: membership.organizationId,
      webinar_id: original.webinar_id,
      name: `${original.name} (copy)`,
      description: original.description,
      success_message: original.success_message,
      redirect_url: original.redirect_url,
      submit_button_text: original.submit_button_text,
      logo_url: original.logo_url,
      branding: original.branding,
      is_paid: original.is_paid,
      price_amount: original.price_amount,
      currency: original.currency,
      is_published: false,
    },
    `${original.name}-copy`
  );

  if (error || !inserted) {
    return { error: "Could not duplicate the form." };
  }

  if (fields && fields.length > 0) {
    const { error: fieldsError } = await supabase.from("form_fields").insert(
      fields.map((f) => ({
        organization_id: membership.organizationId,
        form_id: inserted.id,
        field_type: f.field_type,
        field_key: f.field_key,
        label: f.label,
        placeholder: f.placeholder,
        help_text: f.help_text,
        is_required: f.is_required,
        options: f.options,
        validation: f.validation,
        sort_order: f.sort_order,
        is_active: f.is_active,
      }))
    );
    if (fieldsError) {
      return { error: "Form was duplicated but copying fields failed." };
    }
  }

  revalidatePath(`/${orgSlug}/forms`);
  return { newFormId: inserted.id as string };
}

export async function deleteFormAction(
  orgSlug: string,
  formId: string
): Promise<{ error?: string }> {
  const membership = await requireOrgRole(orgSlug, [...DELETE_ROLES]);
  const supabase = await createClient();

  const { count: registrationCount } = await supabase
    .from("registrations")
    .select("*", { count: "exact", head: true })
    .eq("form_id", formId)
    .eq("organization_id", membership.organizationId);

  if (registrationCount && registrationCount > 0) {
    return { error: "This form has registrations and can't be deleted. Unpublish it instead." };
  }

  const { error, data } = await supabase
    .from("forms")
    .delete()
    .eq("id", formId)
    .eq("organization_id", membership.organizationId)
    .eq("is_published", false)
    .select("id");

  if (error) return { error: "Could not delete the form." };
  if (!data || data.length === 0) {
    return { error: "Only unpublished forms can be deleted. Unpublish it first." };
  }

  revalidatePath(`/${orgSlug}/forms`);
  return {};
}
