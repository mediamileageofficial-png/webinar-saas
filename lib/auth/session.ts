import { createClient } from "@/lib/supabase/server";

export type OrgRole =
  | "organization_owner"
  | "organization_admin"
  | "staff"
  | "viewer";

export interface OrgMembership {
  organizationId: string;
  organizationSlug: string;
  organizationName: string;
  role: OrgRole;
}

/**
 * Returns the currently authenticated user, or null. Always resolves the
 * user server-side from the session cookie - never trust a client-supplied
 * user id.
 */
export async function getServerUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Resolves the caller's membership + role for a given organization slug.
 * Returns null if the user is not authenticated or not a member - callers
 * must treat null as "not authorized", never fall back to a default org.
 */
export async function getMembershipForOrgSlug(
  orgSlug: string
): Promise<OrgMembership | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("organization_members")
    .select("role, organizations!inner(id, slug, name)")
    .eq("user_id", user.id)
    .eq("organizations.slug", orgSlug)
    .maybeSingle();

  if (error || !data) return null;

  const organization = Array.isArray(data.organizations)
    ? data.organizations[0]
    : data.organizations;

  if (!organization) return null;

  return {
    organizationId: organization.id,
    organizationSlug: organization.slug,
    organizationName: organization.name,
    role: data.role as OrgRole,
  };
}

export async function isPlatformAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return !!data;
}
