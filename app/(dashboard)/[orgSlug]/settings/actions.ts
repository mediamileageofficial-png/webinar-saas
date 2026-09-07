"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/auth/guards";
import { saveOrgCredentials, deleteOrgCredentials } from "@/lib/integrations/credentials";
import {
  organizationProfileSchema,
  cashfreeCredentialsSchema,
  msg91CredentialsSchema,
  emailCredentialsSchema,
} from "@/lib/validation/schemas/settings";

export interface SettingsActionState {
  error?: string;
  success?: string;
}

// Only the owner manages org profile/billing-adjacent settings, per the role
// matrix from Phase 1 ("Manage org settings" is owner-only).
const OWNER_ONLY = ["organization_owner"] as const;

export async function updateOrganizationProfileAction(
  orgSlug: string,
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const membership = await requireOrgRole(orgSlug, [...OWNER_ONLY]);

  const parsed = organizationProfileSchema.safeParse({
    name: formData.get("name"),
    logoUrl: formData.get("logoUrl"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone"),
    timezone: formData.get("timezone"),
    brandColor: formData.get("brandColor"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const supabase = await createClient();

  // settings is a shared JSONB bucket (also used by the onboarding checklist
  // for its dismissed flag) - read-then-merge, never blind-overwrite, or
  // saving this form would silently erase unrelated settings someone else
  // wrote into the same column.
  const { data: existingOrg } = await supabase
    .from("organizations")
    .select("settings")
    .eq("id", membership.organizationId)
    .maybeSingle();
  const mergedSettings = {
    ...((existingOrg?.settings as Record<string, unknown>) ?? {}),
    brandColor: data.brandColor ?? null,
  };

  const { error } = await supabase
    .from("organizations")
    .update({
      name: data.name,
      logo_url: data.logoUrl ?? null,
      contact_email: data.contactEmail ?? null,
      contact_phone: data.contactPhone ?? null,
      timezone: data.timezone,
      settings: mergedSettings,
    })
    .eq("id", membership.organizationId);

  if (error) {
    return { error: "Could not save organization settings." };
  }

  revalidatePath(`/${orgSlug}/settings`);
  return { success: "Organization profile saved." };
}

/**
 * These three actions are the ONLY way credentials ever get written. Each
 * one: (1) verifies owner-only authorization, (2) validates the form input,
 * (3) writes via saveOrgCredentials (service-role, RLS-locked table). The
 * page that renders the form never receives the previously-saved secret
 * back - it only ever shows a "configured" status (see getCredentialStatus)
 * - so credentials genuinely never round-trip to the browser after saving.
 */
export async function saveCashfreeCredentialsAction(
  orgSlug: string,
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const membership = await requireOrgRole(orgSlug, [...OWNER_ONLY]);

  const parsed = cashfreeCredentialsSchema.safeParse({
    appId: formData.get("appId"),
    secretKey: formData.get("secretKey"),
    webhookSecret: formData.get("webhookSecret"),
    env: formData.get("env"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await saveOrgCredentials(membership.organizationId, "cashfree", parsed.data);
  if (result.error) return { error: result.error };

  revalidatePath(`/${orgSlug}/settings`);
  return { success: "Cashfree credentials saved." };
}

export async function saveMsg91CredentialsAction(
  orgSlug: string,
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const membership = await requireOrgRole(orgSlug, [...OWNER_ONLY]);

  const parsed = msg91CredentialsSchema.safeParse({
    authKey: formData.get("authKey"),
    senderId: formData.get("senderId"),
    integratedNumber: formData.get("integratedNumber"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const credentials: Record<string, string> = { authKey: parsed.data.authKey };
  if (parsed.data.senderId) credentials.senderId = parsed.data.senderId;
  if (parsed.data.integratedNumber) credentials.integratedNumber = parsed.data.integratedNumber;

  const result = await saveOrgCredentials(membership.organizationId, "msg91", credentials);
  if (result.error) return { error: result.error };

  revalidatePath(`/${orgSlug}/settings`);
  return { success: "MSG91 credentials saved." };
}

export async function saveEmailCredentialsAction(
  orgSlug: string,
  _prevState: SettingsActionState,
  formData: FormData
): Promise<SettingsActionState> {
  const membership = await requireOrgRole(orgSlug, [...OWNER_ONLY]);

  const parsed = emailCredentialsSchema.safeParse({
    apiKey: formData.get("apiKey"),
    fromAddress: formData.get("fromAddress"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const result = await saveOrgCredentials(membership.organizationId, "email", parsed.data);
  if (result.error) return { error: result.error };

  revalidatePath(`/${orgSlug}/settings`);
  return { success: "Email provider credentials saved." };
}

export async function disconnectGoogleMeetAction(orgSlug: string): Promise<{ error?: string }> {
  const membership = await requireOrgRole(orgSlug, [...OWNER_ONLY]);
  const result = await deleteOrgCredentials(membership.organizationId, "google_meet");
  if (result.error) return { error: result.error };

  revalidatePath(`/${orgSlug}/settings`);
  return {};
}
