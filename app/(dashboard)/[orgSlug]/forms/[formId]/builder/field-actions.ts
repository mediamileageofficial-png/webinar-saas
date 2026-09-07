"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/auth/guards";
import { formFieldSchema, parseOptions } from "@/lib/validation/schemas/form";

export interface FieldActionState {
  error?: string;
}

const WRITE_ROLES = ["organization_owner", "organization_admin", "staff"] as const;

function parseFieldForm(formData: FormData) {
  return formFieldSchema.safeParse({
    fieldType: formData.get("fieldType"),
    fieldKey: formData.get("fieldKey"),
    label: formData.get("label"),
    placeholder: formData.get("placeholder"),
    helpText: formData.get("helpText"),
    isRequired: formData.get("isRequired") === "on",
    optionsRaw: formData.get("optionsRaw"),
  });
}

export async function addFormFieldAction(
  orgSlug: string,
  formId: string,
  _prevState: FieldActionState,
  formData: FormData
): Promise<FieldActionState> {
  const membership = await requireOrgRole(orgSlug, [...WRITE_ROLES]);

  const parsed = parseFieldForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const supabase = await createClient();

  // Confirm the form belongs to this org before attaching a field to it -
  // defense in depth even though the field insert itself is also org-scoped.
  const { data: form } = await supabase
    .from("forms")
    .select("id")
    .eq("id", formId)
    .eq("organization_id", membership.organizationId)
    .maybeSingle();
  if (!form) {
    return { error: "Form not found." };
  }

  const { data: maxRow } = await supabase
    .from("form_fields")
    .select("sort_order")
    .eq("form_id", formId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = (maxRow?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("form_fields").insert({
    organization_id: membership.organizationId,
    form_id: formId,
    field_type: data.fieldType,
    field_key: data.fieldKey,
    label: data.label,
    placeholder: data.placeholder ?? null,
    help_text: data.helpText ?? null,
    is_required: data.isRequired,
    options: parseOptions(data.optionsRaw).length ? parseOptions(data.optionsRaw) : null,
    sort_order: nextSortOrder,
  });

  if (error) {
    if (error.message.includes("duplicate key")) {
      return { error: "That field key is already used on this form." };
    }
    return { error: "Could not add the field." };
  }

  revalidatePath(`/${orgSlug}/forms/${formId}/builder`);
  return {};
}

export async function updateFormFieldAction(
  orgSlug: string,
  formId: string,
  fieldId: string,
  _prevState: FieldActionState,
  formData: FormData
): Promise<FieldActionState> {
  const membership = await requireOrgRole(orgSlug, [...WRITE_ROLES]);

  const parsed = parseFieldForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase
    .from("form_fields")
    .update({
      field_type: data.fieldType,
      field_key: data.fieldKey,
      label: data.label,
      placeholder: data.placeholder ?? null,
      help_text: data.helpText ?? null,
      is_required: data.isRequired,
      options: parseOptions(data.optionsRaw).length ? parseOptions(data.optionsRaw) : null,
    })
    .eq("id", fieldId)
    .eq("form_id", formId)
    .eq("organization_id", membership.organizationId);

  if (error) {
    if (error.message.includes("duplicate key")) {
      return { error: "That field key is already used on this form." };
    }
    return { error: "Could not update the field." };
  }

  revalidatePath(`/${orgSlug}/forms/${formId}/builder`);
  return {};
}

export async function toggleFieldActiveAction(
  orgSlug: string,
  formId: string,
  fieldId: string,
  isActive: boolean
): Promise<{ error?: string }> {
  const membership = await requireOrgRole(orgSlug, [...WRITE_ROLES]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("form_fields")
    .update({ is_active: isActive })
    .eq("id", fieldId)
    .eq("form_id", formId)
    .eq("organization_id", membership.organizationId);

  if (error) return { error: "Could not update the field." };

  revalidatePath(`/${orgSlug}/forms/${formId}/builder`);
  return {};
}

export async function deleteFormFieldAction(
  orgSlug: string,
  formId: string,
  fieldId: string
): Promise<{ error?: string }> {
  const membership = await requireOrgRole(orgSlug, [...WRITE_ROLES]);
  const supabase = await createClient();

  // Hard delete only while the form is still unpublished - once published,
  // submitted registration_values may reference this field, so deactivating
  // is the safe path instead (see toggleFieldActiveAction).
  const { data: form } = await supabase
    .from("forms")
    .select("is_published")
    .eq("id", formId)
    .eq("organization_id", membership.organizationId)
    .maybeSingle();

  if (!form) return { error: "Form not found." };
  if (form.is_published) {
    return { error: "Deactivate this field instead - the form is already published." };
  }

  const { error } = await supabase
    .from("form_fields")
    .delete()
    .eq("id", fieldId)
    .eq("form_id", formId)
    .eq("organization_id", membership.organizationId);

  if (error) return { error: "Could not delete the field." };

  revalidatePath(`/${orgSlug}/forms/${formId}/builder`);
  return {};
}

export async function moveFormFieldAction(
  orgSlug: string,
  formId: string,
  fieldId: string,
  direction: "up" | "down"
): Promise<{ error?: string }> {
  const membership = await requireOrgRole(orgSlug, [...WRITE_ROLES]);
  const supabase = await createClient();

  const { data: fields, error: fetchError } = await supabase
    .from("form_fields")
    .select("id, sort_order")
    .eq("form_id", formId)
    .eq("organization_id", membership.organizationId)
    .order("sort_order", { ascending: true });

  if (fetchError || !fields) return { error: "Could not load fields." };

  const index = fields.findIndex((f) => f.id === fieldId);
  if (index === -1) return { error: "Field not found." };

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= fields.length) return {}; // already at an edge, no-op

  const current = fields[index];
  const neighbor = fields[swapIndex];

  // NOTE: these two updates are two separate round-trips, not one atomic
  // transaction. A crash between them could leave sort_order inconsistent
  // (though never duplicated in a way that breaks rendering - order just
  // wouldn't reflect the last click). A Postgres RPC would close this gap;
  // acceptable for MVP given how low-stakes a field reorder glitch is.
  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase
      .from("form_fields")
      .update({ sort_order: neighbor.sort_order })
      .eq("id", current.id)
      .eq("organization_id", membership.organizationId),
    supabase
      .from("form_fields")
      .update({ sort_order: current.sort_order })
      .eq("id", neighbor.id)
      .eq("organization_id", membership.organizationId),
  ]);

  if (e1 || e2) return { error: "Could not reorder fields." };

  revalidatePath(`/${orgSlug}/forms/${formId}/builder`);
  return {};
}
