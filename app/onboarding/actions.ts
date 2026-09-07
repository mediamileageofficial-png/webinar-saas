"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getServerUser } from "@/lib/auth/session";
import { createOrganizationSchema } from "@/lib/validation/schemas/organization";

export interface CreateOrgActionState {
  error?: string;
}

export async function createOrganizationAction(
  _prevState: CreateOrgActionState,
  formData: FormData
): Promise<CreateOrgActionState> {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  const parsed = createOrganizationSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();

  // organization_id is never accepted from the client - we create the row
  // ourselves and let Postgres generate its id. RLS additionally requires
  // is_platform_admin() to insert into organizations directly, so this must
  // go through a Postgres function that runs with elevated rights for the
  // "first org" bootstrap step, executed atomically with the owner membership.
  const { data, error } = await supabase.rpc("create_organization_with_owner", {
    org_name: parsed.data.name,
    org_slug: parsed.data.slug,
  });

  if (error) {
    if (error.message.includes("duplicate key")) {
      return { error: "That URL slug is already taken. Try another." };
    }
    return { error: "Could not create the organization. Please try again." };
  }

  redirect(`/${data as string}/dashboard`);
}
