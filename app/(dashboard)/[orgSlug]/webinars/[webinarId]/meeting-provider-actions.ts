"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/auth/guards";
import { meetingProviderSchema } from "@/lib/validation/schemas/meeting-provider";
import { syncWebinarAttendance } from "@/lib/attendance-sync/sync";

const WRITE_ROLES = ["organization_owner", "organization_admin", "staff"] as const;

export interface MeetingProviderActionState {
  error?: string;
  success?: string;
}

export async function setMeetingProviderAction(
  orgSlug: string,
  webinarId: string,
  _prevState: MeetingProviderActionState,
  formData: FormData
): Promise<MeetingProviderActionState> {
  const membership = await requireOrgRole(orgSlug, [...WRITE_ROLES]);

  const parsed = meetingProviderSchema.safeParse({
    meetingProvider: formData.get("meetingProvider"),
    providerMeetingId: formData.get("providerMeetingId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  // A provider without a meeting id (or vice versa) is meaningless - clear
  // both together rather than leaving a half-configured, unusable state.
  const meetingProvider =
    data.meetingProvider && data.providerMeetingId ? data.meetingProvider : null;
  const providerMeetingId =
    data.meetingProvider && data.providerMeetingId ? data.providerMeetingId : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("webinars")
    .update({ meeting_provider: meetingProvider, provider_meeting_id: providerMeetingId })
    .eq("id", webinarId)
    .eq("organization_id", membership.organizationId);

  if (error) {
    return { error: "Could not save the meeting provider." };
  }

  revalidatePath(`/${orgSlug}/webinars/${webinarId}`);
  return { success: "Meeting provider saved." };
}

export async function syncAttendanceAction(
  orgSlug: string,
  webinarId: string
): Promise<{ error?: string; success?: string }> {
  const membership = await requireOrgRole(orgSlug, [...WRITE_ROLES]);

  try {
    const result = await syncWebinarAttendance(webinarId, membership.organizationId);
    revalidatePath(`/${orgSlug}/registrations`);
    revalidatePath(`/${orgSlug}/webinars/${webinarId}`);
    revalidatePath(`/${orgSlug}/dashboard`);
    return {
      success: `Matched ${result.matchedCount} attendee(s). ${result.unmatchedCount} participant(s) could not be matched to a registration.`,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Attendance sync failed." };
  }
}
