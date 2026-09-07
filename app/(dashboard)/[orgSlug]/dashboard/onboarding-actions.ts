"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/auth/guards";

export async function dismissOnboardingChecklistAction(
  orgSlug: string
): Promise<{ error?: string }> {
  const membership = await requireOrgRole(orgSlug, [
    "organization_owner",
    "organization_admin",
    "staff",
  ]);
  const supabase = await createClient();

  // Read-then-merge, same reasoning as the profile save action - settings is
  // a shared JSONB bucket, never blind-overwrite it.
  const { data: org } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", membership.organizationId)
    .maybeSingle();
  const mergedSettings = {
    ...((org?.settings as Record<string, unknown>) ?? {}),
    onboardingDismissed: true,
  };

  const { error } = await supabase
    .from("organizations")
    .update({ settings: mergedSettings })
    .eq("id", membership.organizationId);

  if (error) return { error: "Could not update." };

  revalidatePath(`/${orgSlug}/dashboard`);
  return {};
}
