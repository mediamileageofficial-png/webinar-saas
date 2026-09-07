import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrgCredentials } from "@/lib/integrations/credentials";
import { ZoomAttendanceProvider } from "./zoom";
import { GoogleMeetAttendanceProvider } from "./google-meet";
import type { AttendanceSyncProvider } from "./provider";

export interface SyncAttendanceResult {
  matchedCount: number;
  unmatchedCount: number;
}

function getProviderInstance(
  provider: "zoom" | "google_meet",
  organizationId: string,
  credentials: Record<string, string> | null
): AttendanceSyncProvider {
  if (provider === "zoom") return new ZoomAttendanceProvider(credentials);
  if (provider === "google_meet") return new GoogleMeetAttendanceProvider(organizationId, credentials);
  throw new Error(`Attendance sync for "${provider}" is not yet available.`);
}

/**
 * Fetches attendance from whichever provider the webinar is linked to,
 * matches participants to registrations by email (case-insensitive), and
 * marks matched registrations attended using the SAME upsert this app has
 * used since Phase 10 - registration.status is never touched, only the
 * dedicated attendance table.
 *
 * Deliberately does NOT:
 *   - invent new registrations for unmatched participants
 *   - mark a registration no-show just because no participant matched it
 *     (absence in a video report and an explicit no-show marking are
 *     different claims - only an admin action asserts the latter)
 *   - match anonymous/no-email participants by name alone (unreliable,
 *     risks marking the wrong registrant as attended)
 */
export async function syncWebinarAttendance(
  webinarId: string,
  organizationId: string
): Promise<SyncAttendanceResult> {
  const supabase = createAdminClient();

  const { data: webinar, error: webinarError } = await supabase
    .from("webinars")
    .select("id, meeting_provider, provider_meeting_id")
    .eq("id", webinarId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (webinarError || !webinar || !webinar.meeting_provider || !webinar.provider_meeting_id) {
    throw new Error("This webinar has no meeting provider configured.");
  }

  const credentials = await getOrgCredentials(organizationId, webinar.meeting_provider);

  let matchedCount = 0;
  let unmatchedCount = 0;
  let failureReason: string | null = null;

  try {
    const provider = getProviderInstance(webinar.meeting_provider, organizationId, credentials);
    const { participants } = await provider.fetchAttendance(webinar.provider_meeting_id);

    const { data: registrations } = await supabase
      .from("registrations")
      .select("id, email")
      .eq("organization_id", organizationId)
      .eq("webinar_id", webinarId)
      .eq("status", "confirmed");

    const registrationIdByEmail = new Map(
      (registrations ?? [])
        .filter((r): r is { id: string; email: string } => Boolean(r.email))
        .map((r) => [r.email.toLowerCase(), r.id])
    );

    for (const participant of participants) {
      const registrationId = participant.email
        ? registrationIdByEmail.get(participant.email.toLowerCase())
        : undefined;

      if (!registrationId) {
        unmatchedCount += 1;
        continue;
      }

      await supabase.from("attendance").upsert(
        {
          organization_id: organizationId,
          registration_id: registrationId,
          webinar_id: webinarId,
          attended: true,
          marked_at: new Date().toISOString(),
        },
        { onConflict: "registration_id" }
      );
      matchedCount += 1;
    }
  } catch (err) {
    failureReason = err instanceof Error ? err.message : "Attendance sync failed.";
  }

  await supabase.from("attendance_sync_logs").insert({
    organization_id: organizationId,
    webinar_id: webinarId,
    provider: webinar.meeting_provider,
    matched_count: matchedCount,
    unmatched_count: unmatchedCount,
    status: failureReason ? "failed" : "success",
    failure_reason: failureReason,
  });

  if (failureReason) {
    throw new Error(failureReason);
  }

  return { matchedCount, unmatchedCount };
}
