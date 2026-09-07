"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOrgRole } from "@/lib/auth/guards";
import {
  webinarSchema,
  webinarStatuses,
  canTransitionWebinarStatus,
  type WebinarStatus,
} from "@/lib/validation/schemas/webinar";

export interface WebinarActionState {
  error?: string;
}

const WRITE_ROLES = ["organization_owner", "organization_admin", "staff"] as const;
const DELETE_ROLES = ["organization_owner", "organization_admin"] as const;

function parseWebinarForm(formData: FormData) {
  return webinarSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    eventDate: formData.get("eventDate"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    timezone: formData.get("timezone") || "Asia/Kolkata",
    speakerName: formData.get("speakerName"),
    speakerDetails: formData.get("speakerDetails"),
    platform: formData.get("platform"),
    joinUrl: formData.get("joinUrl"),
    recordingUrl: formData.get("recordingUrl"),
  });
}

export async function createWebinarAction(
  orgSlug: string,
  _prevState: WebinarActionState,
  formData: FormData
): Promise<WebinarActionState> {
  // organization_id is resolved server-side from the caller's membership in
  // THIS org slug - never accepted from the form.
  const membership = await requireOrgRole(orgSlug, [...WRITE_ROLES]);

  const parsed = parseWebinarForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("webinars").insert({
    organization_id: membership.organizationId,
    name: data.name,
    description: data.description ?? null,
    event_date: data.eventDate,
    start_time: new Date(data.startTime).toISOString(),
    end_time: new Date(data.endTime).toISOString(),
    timezone: data.timezone,
    speaker_name: data.speakerName ?? null,
    speaker_details: data.speakerDetails ?? null,
    platform: data.platform ?? null,
    join_url: data.joinUrl ?? null,
    recording_url: data.recordingUrl ?? null,
    status: "draft",
  });

  if (error) {
    return { error: "Could not create the webinar. Please check the dates and try again." };
  }

  revalidatePath(`/${orgSlug}/webinars`);
  redirect(`/${orgSlug}/webinars`);
}

export async function updateWebinarAction(
  orgSlug: string,
  webinarId: string,
  _prevState: WebinarActionState,
  formData: FormData
): Promise<WebinarActionState> {
  const membership = await requireOrgRole(orgSlug, [...WRITE_ROLES]);

  const parsed = parseWebinarForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const supabase = await createClient();
  // Defense in depth: filter by BOTH id and organization_id explicitly, even
  // though RLS already restricts writes to the caller's own orgs - RLS alone
  // scopes to "any org this user belongs to", not specifically this org slug.
  const { error } = await supabase
    .from("webinars")
    .update({
      name: data.name,
      description: data.description ?? null,
      event_date: data.eventDate,
      start_time: new Date(data.startTime).toISOString(),
      end_time: new Date(data.endTime).toISOString(),
      timezone: data.timezone,
      speaker_name: data.speakerName ?? null,
      speaker_details: data.speakerDetails ?? null,
      platform: data.platform ?? null,
      join_url: data.joinUrl ?? null,
      recording_url: data.recordingUrl ?? null,
    })
    .eq("id", webinarId)
    .eq("organization_id", membership.organizationId);

  if (error) {
    return { error: "Could not update the webinar. Please check the dates and try again." };
  }

  revalidatePath(`/${orgSlug}/webinars`);
  revalidatePath(`/${orgSlug}/webinars/${webinarId}`);
  redirect(`/${orgSlug}/webinars`);
}

export async function changeWebinarStatusAction(
  orgSlug: string,
  webinarId: string,
  currentStatus: WebinarStatus,
  nextStatus: WebinarStatus
): Promise<{ error?: string }> {
  const membership = await requireOrgRole(orgSlug, [...WRITE_ROLES]);

  if (!webinarStatuses.includes(nextStatus)) {
    return { error: "Invalid status." };
  }
  if (!canTransitionWebinarStatus(currentStatus, nextStatus)) {
    return { error: `Cannot move a webinar from "${currentStatus}" to "${nextStatus}".` };
  }

  const supabase = await createClient();
  // Re-check the row's CURRENT status server-side as part of the update
  // filter, so a stale client can't "skip" a transition by racing two clicks.
  const { error, data } = await supabase
    .from("webinars")
    .update({ status: nextStatus })
    .eq("id", webinarId)
    .eq("organization_id", membership.organizationId)
    .eq("status", currentStatus)
    .select("id");

  if (error) {
    return { error: "Could not update webinar status." };
  }
  if (!data || data.length === 0) {
    return { error: "The webinar's status changed elsewhere - please refresh." };
  }

  revalidatePath(`/${orgSlug}/webinars`);
  revalidatePath(`/${orgSlug}/webinars/${webinarId}`);
  return {};
}

export async function deleteWebinarAction(
  orgSlug: string,
  webinarId: string
): Promise<{ error?: string }> {
  const membership = await requireOrgRole(orgSlug, [...DELETE_ROLES]);

  const supabase = await createClient();
  // Only allow deleting webinars that never left "draft" - once published,
  // forms/registrations may reference it, so it should be cancelled instead
  // of deleted.
  const { error, data } = await supabase
    .from("webinars")
    .delete()
    .eq("id", webinarId)
    .eq("organization_id", membership.organizationId)
    .eq("status", "draft")
    .select("id");

  if (error) {
    return { error: "Could not delete the webinar." };
  }
  if (!data || data.length === 0) {
    return {
      error: "Only draft webinars can be deleted. Cancel it instead if it's already published.",
    };
  }

  revalidatePath(`/${orgSlug}/webinars`);
  return {};
}
