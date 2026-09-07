import "server-only";
import type { AttendanceSyncProvider, FetchAttendanceResult, AttendanceParticipant } from "./provider";

interface ZoomParticipant {
  name?: string;
  user_email?: string;
  join_time?: string;
  leave_time?: string;
}

export class ZoomAttendanceProvider implements AttendanceSyncProvider {
  private accountId: string;
  private clientId: string;
  private clientSecret: string;

  constructor(orgCredentials?: Record<string, string> | null) {
    this.accountId = orgCredentials?.accountId ?? "";
    this.clientId = orgCredentials?.clientId ?? "";
    this.clientSecret = orgCredentials?.clientSecret ?? "";
  }

  /**
   * Server-to-Server OAuth: no user consent flow, no refresh token - a
   * fresh access token (1 hour TTL) is requested per sync run. Confirmed
   * against Zoom's current docs: query-string params, Basic auth header
   * built from client id/secret, no request body.
   */
  private async getAccessToken(): Promise<string> {
    if (!this.accountId || !this.clientId || !this.clientSecret) {
      throw new Error("Zoom is not configured for this organization.");
    }

    const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    const url = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(this.accountId)}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Basic ${basicAuth}` },
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.access_token) {
      throw new Error(data?.message || data?.reason || "Could not authenticate with Zoom.");
    }

    return data.access_token;
  }

  async fetchAttendance(meetingId: string): Promise<FetchAttendanceResult> {
    const accessToken = await this.getAccessToken();
    const participants: AttendanceParticipant[] = [];
    let nextPageToken: string | undefined;

    do {
      const url = new URL(
        `https://api.zoom.us/v2/report/meetings/${encodeURIComponent(meetingId)}/participants`
      );
      url.searchParams.set("page_size", "300");
      if (nextPageToken) url.searchParams.set("next_page_token", nextPageToken);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data) {
        throw new Error(data?.message || "Could not fetch Zoom meeting participants.");
      }

      for (const p of (data.participants ?? []) as ZoomParticipant[]) {
        participants.push({
          email: p.user_email || null,
          name: p.name ?? "Unknown",
          joinedAt: p.join_time ?? "",
          leftAt: p.leave_time ?? "",
        });
      }

      nextPageToken = data.next_page_token || undefined;
    } while (nextPageToken);

    return { participants };
  }
}
