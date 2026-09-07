import type { createClient } from "@/lib/supabase/server";
import { getCredentialStatus } from "@/lib/integrations/credentials";

export interface ChecklistItem {
  id: string;
  label: string;
  href: string;
  complete: boolean;
}

/**
 * Computes each onboarding step's completion from the org's actual current
 * data - never a stored "did they click through this step" flag, so it
 * can't drift out of sync with reality (e.g. if someone deletes their only
 * webinar, the "create a webinar" step correctly becomes incomplete again).
 */
export async function getOnboardingChecklist(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  orgSlug: string
): Promise<ChecklistItem[]> {
  const [{ data: org }, { count: webinarCount }, { data: forms }, cashfreeStatus, msg91Status] =
    await Promise.all([
      supabase.from("organizations").select("contact_email").eq("id", organizationId).maybeSingle(),
      supabase
        .from("webinars")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId),
      supabase.from("forms").select("id, is_paid, is_published").eq("organization_id", organizationId),
      getCredentialStatus(organizationId, "cashfree"),
      getCredentialStatus(organizationId, "msg91"),
    ]);

  const hasWebinar = (webinarCount ?? 0) > 0;
  const hasForm = (forms?.length ?? 0) > 0;
  const hasPaidForm = forms?.some((f) => f.is_paid) ?? false;
  const hasPublishedForm = forms?.some((f) => f.is_published) ?? false;

  return [
    {
      id: "profile",
      label: "Complete your organization profile",
      href: `/${orgSlug}/settings`,
      complete: Boolean(org?.contact_email),
    },
    {
      id: "webinar",
      label: "Create your first webinar",
      href: `/${orgSlug}/webinars/new`,
      complete: hasWebinar,
    },
    {
      id: "form",
      label: "Create your first registration form",
      href: `/${orgSlug}/forms/new`,
      complete: hasForm,
    },
    {
      id: "payment",
      label: "Configure payment (only needed for paid forms)",
      href: `/${orgSlug}/settings`,
      // Not blocking for tenants running free-only events - complete unless
      // they actually have a paid form waiting on real credentials.
      complete: !hasPaidForm || cashfreeStatus.configured,
    },
    {
      id: "msg91",
      label: "Configure MSG91 for SMS/WhatsApp confirmations",
      href: `/${orgSlug}/settings`,
      complete: msg91Status.configured,
    },
    {
      id: "publish",
      label: "Publish your form",
      href: `/${orgSlug}/forms`,
      complete: hasPublishedForm,
    },
  ];
}
