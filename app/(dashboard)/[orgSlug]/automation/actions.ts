"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/auth/guards";
import { automationRuleSchema } from "@/lib/validation/schemas/automation-rule";

export interface AutomationRuleActionState {
  error?: string;
}

const WRITE_ROLES = ["organization_owner", "organization_admin"] as const;

export async function createAutomationRuleAction(
  orgSlug: string,
  _prevState: AutomationRuleActionState,
  formData: FormData
): Promise<AutomationRuleActionState> {
  const membership = await requireOrgRole(orgSlug, [...WRITE_ROLES]);

  const parsed = automationRuleSchema.safeParse({
    webinarId: formData.get("webinarId"),
    trigger: formData.get("trigger"),
    offsetMinutes: formData.get("offsetMinutes"),
    channel: formData.get("channel"),
    templateKey: formData.get("templateKey"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  // Internal convention (see lib/automation/engine.ts): trigger_time =
  // anchor_time + offset_minutes. A person configuring "24 hours before"
  // types a positive 1440; we store it as -1440 so the engine's arithmetic
  // (anchor + offset) correctly lands BEFORE the webinar starts.
  const offsetMinutes =
    data.trigger === "before_webinar"
      ? -Number(data.offsetMinutes)
      : data.trigger === "after_webinar"
        ? Number(data.offsetMinutes)
        : null;

  const supabase = await createClient();
  const { error } = await supabase.from("automation_rules").insert({
    organization_id: membership.organizationId,
    webinar_id: data.webinarId ?? null,
    trigger: data.trigger,
    offset_minutes: offsetMinutes,
    channel: data.channel,
    template_key: data.templateKey,
    is_active: true,
  });

  if (error) {
    return { error: "Could not create the automation rule." };
  }

  revalidatePath(`/${orgSlug}/automation`);
  return {};
}

export async function toggleAutomationRuleAction(
  orgSlug: string,
  ruleId: string,
  isActive: boolean
): Promise<{ error?: string }> {
  const membership = await requireOrgRole(orgSlug, [...WRITE_ROLES]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("automation_rules")
    .update({ is_active: isActive })
    .eq("id", ruleId)
    .eq("organization_id", membership.organizationId);

  if (error) return { error: "Could not update the rule." };

  revalidatePath(`/${orgSlug}/automation`);
  return {};
}

export async function deleteAutomationRuleAction(
  orgSlug: string,
  ruleId: string
): Promise<{ error?: string }> {
  const membership = await requireOrgRole(orgSlug, [...WRITE_ROLES]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("automation_rules")
    .delete()
    .eq("id", ruleId)
    .eq("organization_id", membership.organizationId);

  if (error) return { error: "Could not delete the rule." };

  revalidatePath(`/${orgSlug}/automation`);
  return {};
}
