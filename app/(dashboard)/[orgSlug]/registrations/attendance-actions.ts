"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/auth/guards";
import { sendTemplatedMessage } from "@/lib/messaging/send";
import { buildRegistrationVariables } from "@/lib/messaging/build-registration-variables";

const WRITE_ROLES = ["organization_owner", "organization_admin", "staff"] as const;

export interface AttendanceActionState {
  error?: string;
}

/**
 * IMPORTANT: this deliberately never writes to `registrations.status`.
 *
 * The `registration_status` enum (from 0001_core_schema.sql) technically
 * includes 'attended' and 'no_show' values, but the plan is explicit that
 * registration status and attendance status must stay separate ("Example:
 * Registration: Confirmed, Attendance: Attended"). Those two enum values are
 * an artifact of an earlier schema pass and are intentionally left unused -
 * attendance lives ONLY in the `attendance` table's `attended` boolean.
 * Altering the enum to remove them would need its own careful migration;
 * not doing so here doesn't cause any harm since nothing ever sets them.
 */
export async function markAttendanceAction(
  orgSlug: string,
  webinarId: string,
  registrationId: string,
  attended: boolean
): Promise<{ error?: string }> {
  const membership = await requireOrgRole(orgSlug, [...WRITE_ROLES]);
  const supabase = await createClient();

  // Confirm the registration actually belongs to this webinar + org before
  // writing anything - defense in depth beyond RLS (see the recurring note
  // elsewhere in this codebase about RLS scoping to "any org the caller
  // belongs to", not specifically this one).
  const { data: registration } = await supabase
    .from("registrations")
    .select("id")
    .eq("id", registrationId)
    .eq("webinar_id", webinarId)
    .eq("organization_id", membership.organizationId)
    .maybeSingle();

  if (!registration) {
    return { error: "Registration not found for this webinar." };
  }

  const { error } = await supabase.from("attendance").upsert(
    {
      organization_id: membership.organizationId,
      registration_id: registrationId,
      webinar_id: webinarId,
      attended,
      marked_at: new Date().toISOString(),
    },
    { onConflict: "registration_id" }
  );

  if (error) {
    return { error: "Could not record attendance." };
  }

  if (!attended) {
    // Fire the "no_show" automation trigger synchronously - there's no
    // useful time window to poll for "was this just marked no-show" (unlike
    // before/after_webinar in Phase 9), so this is an event-based send, same
    // pattern as registration_created/payment_success. sendTemplatedMessage
    // never throws, so a messaging failure can't affect this action's result.
    //
    // The .or() filter below is a raw PostgREST filter string - even though
    // webinarId was already confirmed to match a real row above, we validate
    // its shape explicitly here rather than relying on that as an implicit
    // guarantee against filter-string injection.
    const isUuidShaped = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      webinarId
    );
    const { data: rules } = isUuidShaped
      ? await supabase
          .from("automation_rules")
          .select("id, channel, template_key")
          .eq("organization_id", membership.organizationId)
          .eq("trigger", "no_show")
          .eq("is_active", true)
          .or(`webinar_id.eq.${webinarId},webinar_id.is.null`)
      : { data: null };

    if (rules && rules.length > 0) {
      const built = await buildRegistrationVariables(supabase, registrationId);
      if (built) {
        for (const rule of rules) {
          const recipient =
            rule.channel === "email" ? built.registration.email : built.registration.mobile;
          if (!recipient) continue;

          await sendTemplatedMessage({
            organizationId: membership.organizationId,
            registrationId,
            templateKey: rule.template_key,
            channel: rule.channel,
            recipient,
            variables: built.variables,
            dedupeSuffix: rule.id,
          });
        }
      }
    }
  }

  revalidatePath(`/${orgSlug}/registrations`);
  revalidatePath(`/${orgSlug}/webinars/${webinarId}`);
  revalidatePath(`/${orgSlug}/dashboard`);
  return {};
}
