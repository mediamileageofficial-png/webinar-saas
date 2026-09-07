export interface AttendanceParticipant {
  /** null for anonymous/guest participants who didn't provide an email - these cannot be matched to a registration. */
  email: string | null;
  name: string;
  joinedAt: string;
  leftAt: string;
}

export interface FetchAttendanceResult {
  participants: AttendanceParticipant[];
}

/**
 * Abstraction over a video-meeting attendance source, so Zoom, Google Meet,
 * or a future provider (Teams, Webex) can all plug into the same sync logic
 * without that logic knowing which provider it's talking to.
 */
export interface AttendanceSyncProvider {
  fetchAttendance(meetingRef: string): Promise<FetchAttendanceResult>;
}
