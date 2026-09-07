"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/auth/guards";
import { messageTemplateSchema } from "@/lib/validation/schemas/message-template";
import { extractVariableNames } from "@/lib/templates/render";

export interface TemplateActionState {
  error?: string;
}

// Templates control outbound tenant communications (and provider template
// ids tied to billing) - keep this to admin/owner, not general staff.
const WRITE_ROLES = ["organization_owner", "organization_admin"] as const;

export async function saveMessageTemplateAction(
  orgSlug: string,
  _prevState: TemplateActionState,
  formData: FormData
): Promise<TemplateActionState> {
  const membership = await requireOrgRole(orgSlug, [...WRITE_ROLES]);

  const parsed = messageTemplateSchema.safeParse({
    key: formData.get("key"),
    channel: formData.get("channel"),
    subject: formData.get("subject"),
    body: formData.get("body"),
    providerTemplateId: formData.get("providerTemplateId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const supabase = await createClient();

  // Versioning per the plan ("Store template versions"): never mutate an
  // existing row in place - deactivate the current active version (if any)
  // and insert a new one, preserving full history.
  const { data: current } = await supabase
    .from("message_templates")
    .select("id, version")
    .eq("organization_id", membership.organizationId)
    .eq("key", data.key)
    .eq("channel", data.channel)
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (current) {
    await supabase
      .from("message_templates")
      .update({ is_active: false })
      .eq("id", current.id)
      .eq("organization_id", membership.organizationId);
  }

  const nextVersion = (current?.version ?? 0) + 1;
  const variableOrder = extractVariableNames(data.body);

  const { error } = await supabase.from("message_templates").insert({
    organization_id: membership.organizationId,
    key: data.key,
    channel: data.channel,
    version: nextVersion,
    subject: data.subject ?? null,
    body: data.body,
    provider_template_id: data.providerTemplateId ?? null,
    provider_variable_order: variableOrder,
    is_active: true,
  });

  if (error) {
    return { error: "Could not save the template." };
  }

  revalidatePath(`/${orgSlug}/messages`);
  return {};
}
