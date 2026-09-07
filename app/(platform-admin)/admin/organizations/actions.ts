"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/guards";
import { createOrganizationSchema } from "@/lib/validation/schemas/organization";

export interface AdminActionState {
  error?: string;
}

export async function createOrganizationAsAdminAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  await requirePlatformAdmin();

  const parsed = createOrganizationSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  // Platform admins are allowed to INSERT into organizations directly per
  // RLS (org_insert_platform_admin) - unlike self-serve signup, this doesn't
  // create an owner membership; the admin invites/assigns an owner separately.
  const { error } = await supabase.from("organizations").insert({
    name: parsed.data.name,
    slug: parsed.data.slug,
  });

  if (error) {
    if (error.message.includes("duplicate key")) {
      return { error: "That URL slug is already taken." };
    }
    return { error: "Could not create the organization." };
  }

  revalidatePath("/admin/organizations");
  return {};
}

export async function setOrganizationStatusAction(
  organizationId: string,
  status: "active" | "suspended"
): Promise<{ error?: string }> {
  await requirePlatformAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ status })
    .eq("id", organizationId);

  if (error) {
    return { error: "Could not update organization status." };
  }

  revalidatePath("/admin/organizations");
  return {};
}
