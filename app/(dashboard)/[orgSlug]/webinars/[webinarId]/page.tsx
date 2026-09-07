import { notFound } from "next/navigation";
import { getMembershipForOrgSlug } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { WebinarForm } from "../webinar-form";
import { updateWebinarAction } from "../actions";
import { WebinarStatusControls } from "../webinar-status-controls";
import { MeetingProviderForm } from "./meeting-provider-form";
import { SyncAttendanceButton } from "./sync-attendance-button";
import type { WebinarStatus } from "@/lib/validation/schemas/webinar";

// NOTE: for MVP simplicity this renders timestamps using the server's local
// clock (this project runs in UTC), not the webinar's own `timezone` field.
// Timezone-aware display/editing is a good follow-up once a date library
// (e.g. date-fns-tz) is added - flagging rather than hiding the simplification.
function toDatetimeLocalValue(iso: string): string {
  return new Date(iso).toISOString().slice(0, 16);
}

export default async function WebinarDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; webinarId: string }>;
}) {
  const { orgSlug, webinarId } = await params;
  const membership = await getMembershipForOrgSlug(orgSlug);
  if (!membership) notFound();

  const supabase = await createClient();
  const { data: webinar, error } = await supabase
    .from("webinars")
    .select("*")
    .eq("id", webinarId)
    .eq("organization_id", membership.organizationId)
    .maybeSingle();

  if (error || !webinar) notFound();

  const canWrite = ["organization_owner", "organization_admin", "staff"].includes(
    membership.role
  );

  const { data: syncLogs } = canWrite
    ? await supabase
        .from("attendance_sync_logs")
        .select("id, provider, matched_count, unmatched_count, status, failure_reason, created_at")
        .eq("webinar_id", webinarId)
        .order("created_at", { ascending: false })
        .limit(5)
    : { data: null };

  const boundAction = updateWebinarAction.bind(null, orgSlug, webinarId);

  return (
    <div>
      <h1 className="text-lg font-semibold text-slate-900">{webinar.name}</h1>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <WebinarStatusControls
          orgSlug={orgSlug}
          webinarId={webinar.id}
          status={webinar.status as WebinarStatus}
        />
      </div>

      {canWrite && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-900">Attendance sync</h2>
          <p className="mt-1 text-sm text-slate-500">
            Link this webinar to Zoom or Google Meet to automatically mark
            attendance for registrants who join, matched by email. Manual
            attendance marking on the Registrations page still works either way.
          </p>
          <div className="mt-3">
            <MeetingProviderForm
              orgSlug={orgSlug}
              webinarId={webinar.id}
              currentProvider={webinar.meeting_provider}
              currentMeetingId={webinar.provider_meeting_id}
            />
          </div>
          {webinar.meeting_provider && webinar.provider_meeting_id && (
            <div className="mt-4">
              <SyncAttendanceButton orgSlug={orgSlug} webinarId={webinar.id} />
            </div>
          )}
          {syncLogs && syncLogs.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium uppercase text-slate-400">Recent syncs</p>
              <ul className="mt-1 flex flex-col gap-1 text-xs text-slate-500">
                {syncLogs.map((log) => (
                  <li key={log.id}>
                    {new Date(log.created_at).toLocaleString()} &middot;{" "}
                    {log.status === "success"
                      ? `${log.matched_count} matched, ${log.unmatched_count} unmatched`
                      : `Failed: ${log.failure_reason}`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {canWrite ? (
        <div className="mt-6">
          <WebinarForm
            action={boundAction}
            submitLabel="Save changes"
            defaults={{
              name: webinar.name,
              description: webinar.description ?? undefined,
              eventDate: webinar.event_date,
              startTime: toDatetimeLocalValue(webinar.start_time),
              endTime: toDatetimeLocalValue(webinar.end_time),
              timezone: webinar.timezone,
              speakerName: webinar.speaker_name ?? undefined,
              speakerDetails: webinar.speaker_details ?? undefined,
              platform: webinar.platform ?? undefined,
              joinUrl: webinar.join_url ?? undefined,
              recordingUrl: webinar.recording_url ?? undefined,
            }}
          />
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-400">
          You have view-only access to this organization.
        </p>
      )}
    </div>
  );
}
