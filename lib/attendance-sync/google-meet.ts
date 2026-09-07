import "server-only";
import { saveOrgCredentials } from "@/lib/integrations/credentials";
import type { AttendanceSyncProvider, FetchAttendanceResult, AttendanceParticipant } from "./provider";

interface GoogleMeetCredentials {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
}

interface GoogleParticipant {
  anonymousUser?: { displayName?: string };
  signedinUser?: { user?: string; displayName?: string };
  phoneUser?: { displayName?: string };
}

export class GoogleMeetAttendanceProvider implements AttendanceSyncProvider {
  private credentials: GoogleMeetCredentials;

  constructor(
    private organizationId: string,
    orgCredentials?: Record<string, string> | null
  ) {
    this.credentials = orgCredentials ?? {};
  }

  /**
   * Google access tokens expire in ~1 hour. Refreshes (and persists) a new
   * one when needed - unlike Zoom's stateless S2S tokens, Google's
   * refresh_token must be stored long-term and reused, so this is the one
   * provider that writes back to organization_credentials as a side effect
   * of reading from it.
   */
  private async getValidAccessToken(): Promise<string> {
    if (!this.credentials.accessToken || !this.credentials.refreshToken) {
      throw new Error("Google Meet is not connected for this organization.");
    }

    const expiresAtMs = this.credentials.expiresAt
      ? new Date(this.credentials.expiresAt).getTime()
      : 0;
    if (Date.now() < expiresAtMs - 60_000) {
      return this.credentials.accessToken;
    }

    const clientId = process.env.GOOGLE_MEET_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_MEET_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("Google Meet integration is not configured on this platform.");
    }

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: this.credentials.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.access_token) {
      throw new Error(
        data?.error_description ||
          "Could not refresh the Google Meet connection. Reconnect the account in Settings."
      );
    }

    const newExpiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
    await saveOrgCredentials(this.organizationId, "google_meet", {
      accessToken: data.access_token,
      refreshToken: this.credentials.refreshToken,
      expiresAt: newExpiresAt,
    });

    this.credentials = {
      ...this.credentials,
      accessToken: data.access_token,
      expiresAt: newExpiresAt,
    };
    return data.access_token;
  }

  async fetchAttendance(meetingRef: string): Promise<FetchAttendanceResult> {
    const accessToken = await this.getValidAccessToken();

    let conferenceRecordName = meetingRef;
    if (!meetingRef.startsWith("conferenceRecords/")) {
      const listUrl = new URL("https://meet.googleapis.com/v2/conferenceRecords");
      listUrl.searchParams.set("filter", `space.name="spaces/${meetingRef}"`);
      const listRes = await fetch(listUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const listData = await listRes.json().catch(() => null);

      if (!listRes.ok || !listData?.conferenceRecords?.length) {
        throw new Error("No Google Meet conference record found for this space.");
      }
      conferenceRecordName = listData.conferenceRecords[0].name;
    }

    const participants: AttendanceParticipant[] = [];
    let pageToken: string | undefined;

    do {
      const url = new URL(`https://meet.googleapis.com/v2/${conferenceRecordName}/participants`);
      url.searchParams.set("pageSize", "100");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data) {
        throw new Error(data?.error?.message || "Could not fetch Google Meet participants.");
      }

      for (const p of (data.participants ?? []) as GoogleParticipant[]) {
        if (p.anonymousUser) {
          participants.push({
            email: null,
            name: p.anonymousUser.displayName ?? "Anonymous",
            joinedAt: "",
            leftAt: "",
          });
        } else if (p.signedinUser) {
          const email = p.signedinUser.user
            ? await this.tryResolveEmail(p.signedinUser.user, accessToken)
            : null;
          participants.push({
            email,
            name: p.signedinUser.displayName ?? "Unknown",
            joinedAt: "",
            leftAt: "",
          });
        } else {
          participants.push({ email: null, name: "Unknown participant", joinedAt: "", leftAt: "" });
        }
      }

      pageToken = data.nextPageToken || undefined;
    } while (pageToken);

    return { participants };
  }

  /**
   * BEST EFFORT ONLY, and this is a real, meaningful limitation, not an
   * edge case: resolving a signed-in Meet participant's email requires the
   * CONNECTED Google account to itself have Workspace Admin Directory read
   * access. A personal Gmail account, or a non-admin Workspace user,
   * cannot do this no matter what scope this app requests - Google simply
   * rejects the Directory API call for them. This app works around that by
   * catching the failure per-participant and returning null (unmatched)
   * rather than failing the entire sync - but for many organizations
   * (anyone connecting a personal or non-admin account), MOST signed-in
   * participants will come back unmatched here. Full, reliable resolution
   * needs a Workspace admin to grant a service account domain-wide
   * delegation - a separate, bigger integration this app does not attempt.
   */
  private async tryResolveEmail(userResource: string, accessToken: string): Promise<string | null> {
    try {
      const userId = userResource.replace(/^users\//, "");
      const res = await fetch(
        `https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(userId)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      return data?.primaryEmail ?? null;
    } catch {
      return null;
    }
  }
}
