import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type IntegrationProvider =
  | "msg91"
  | "cashfree"
  | "email"
  | "cashfree_payouts"
  | "cashfree_verification"
  | "zoom"
  | "google_meet";

/**
 * Reads a tenant's stored credentials for a provider. This is the ONLY
 * function in the codebase that reads from organization_credentials - it
 * uses the service-role client because RLS on that table denies every other
 * role, including the organization's own owner (see 0009_organization_credentials.sql).
 * Callers must have already authorized the request themselves (this function
 * does not check org membership/role - it trusts the caller to have done so).
 */
export async function getOrgCredentials(
  organizationId: string,
  provider: IntegrationProvider
): Promise<Record<string, string> | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("organization_credentials")
    .select("credentials")
    .eq("organization_id", organizationId)
    .eq("provider", provider)
    .maybeSingle();

  if (error || !data) return null;
  return data.credentials as Record<string, string>;
}

/**
 * Saves (upserts) a tenant's credentials for a provider. Callers MUST verify
 * authorization (requireOrgRole with owner/admin) before calling this - it
 * performs no authorization checks of its own, matching the pattern used
 * everywhere else the admin client is used for a write.
 */
export async function saveOrgCredentials(
  organizationId: string,
  provider: IntegrationProvider,
  credentials: Record<string, string>
): Promise<{ error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("organization_credentials").upsert(
    { organization_id: organizationId, provider, credentials },
    { onConflict: "organization_id,provider" }
  );

  if (error) return { error: "Could not save credentials." };
  return {};
}

/**
 * Returns ONLY whether a credential is configured and when it was last
 * updated - never the credential values themselves. This is what the
 * settings UI uses to render "Configured (updated Jan 5)" without ever
 * bringing a secret into a server component's props (and therefore into the
 * rendered HTML sent to the browser).
 */
export async function getCredentialStatus(
  organizationId: string,
  provider: IntegrationProvider
): Promise<{ configured: boolean; updatedAt: string | null }> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("organization_credentials")
    .select("updated_at")
    .eq("organization_id", organizationId)
    .eq("provider", provider)
    .maybeSingle();

  return { configured: Boolean(data), updatedAt: data?.updated_at ?? null };
}

/**
 * Removes a stored credential entirely (e.g. "Disconnect" in Settings).
 * Callers must have already authorized the request, same as saveOrgCredentials.
 */
export async function deleteOrgCredentials(
  organizationId: string,
  provider: IntegrationProvider
): Promise<{ error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("organization_credentials")
    .delete()
    .eq("organization_id", organizationId)
    .eq("provider", provider);

  if (error) return { error: "Could not disconnect this integration." };
  return {};
}
