import { notFound } from "next/navigation";
import { getMembershipForOrgSlug } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getCredentialStatus } from "@/lib/integrations/credentials";
import { OrgProfileForm } from "./org-profile-form";
import { CredentialStatus } from "./credential-status";
import { GoogleMeetConnection } from "./google-meet-connection";
import {
  CashfreeCredentialsForm,
  Msg91CredentialsForm,
  EmailCredentialsForm,
} from "./credential-forms";

export default async function SettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ googleMeetConnected?: string; googleMeetError?: string }>;
}) {
  const { orgSlug } = await params;
  const { googleMeetConnected, googleMeetError } = await searchParams;
  const membership = await getMembershipForOrgSlug(orgSlug);
  if (!membership) notFound();

  const isOwner = membership.role === "organization_owner";

  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organizations")
    .select("name, logo_url, contact_email, contact_phone, timezone, settings")
    .eq("id", membership.organizationId)
    .maybeSingle();

  // Credential STATUS only (configured/updated_at) - never the credential
  // values themselves. This is a server component; nothing here ever puts a
  // secret into props, so nothing here can leak one to the browser.
  const [cashfreeStatus, msg91Status, emailStatus, googleMeetStatus] = await Promise.all([
    getCredentialStatus(membership.organizationId, "cashfree"),
    getCredentialStatus(membership.organizationId, "msg91"),
    getCredentialStatus(membership.organizationId, "email"),
    getCredentialStatus(membership.organizationId, "google_meet"),
  ]);

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">Settings</h1>

      {!isOwner && (
        <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Only the organization owner can change these settings.
        </p>
      )}

      {googleMeetConnected && (
        <p className="mt-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
          Google Meet connected.
        </p>
      )}
      {googleMeetError && (
        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Could not connect Google Meet ({googleMeetError}). Please try again.
        </p>
      )}

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-slate-900">Organization profile</h2>
        {isOwner && org ? (
          <div className="mt-3">
            <OrgProfileForm
              orgSlug={orgSlug}
              defaults={{
                name: org.name,
                logoUrl: org.logo_url ?? undefined,
                contactEmail: org.contact_email ?? undefined,
                contactPhone: org.contact_phone ?? undefined,
                timezone: org.timezone,
                brandColor: (org.settings as { brandColor?: string } | null)?.brandColor ?? undefined,
              }}
            />
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">{org?.name}</p>
        )}
      </section>

      {isOwner && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold text-slate-900">Integration settings</h2>
          <p className="mt-1 text-sm text-slate-500">
            Credentials are stored server-side only and are never shown again
            after saving - only whether each integration is configured.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-900">Cashfree</h3>
                <CredentialStatus
                  configured={cashfreeStatus.configured}
                  updatedAt={cashfreeStatus.updatedAt}
                />
              </div>
              <div className="mt-3">
                <CashfreeCredentialsForm orgSlug={orgSlug} />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-900">MSG91</h3>
                <CredentialStatus configured={msg91Status.configured} updatedAt={msg91Status.updatedAt} />
              </div>
              <div className="mt-3">
                <Msg91CredentialsForm orgSlug={orgSlug} />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-900">Email (Resend)</h3>
                <CredentialStatus configured={emailStatus.configured} updatedAt={emailStatus.updatedAt} />
              </div>
              <div className="mt-3">
                <EmailCredentialsForm orgSlug={orgSlug} />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 md:col-span-3">
              <GoogleMeetConnection
                orgSlug={orgSlug}
                connected={googleMeetStatus.configured}
                updatedAt={googleMeetStatus.updatedAt}
              />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
