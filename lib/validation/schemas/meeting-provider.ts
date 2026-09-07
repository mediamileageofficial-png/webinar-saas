import { z } from "zod";

export const meetingProviders = ["zoom", "google_meet"] as const;
export type MeetingProvider = (typeof meetingProviders)[number];

export const meetingProviderSchema = z.object({
  meetingProvider: z.enum(meetingProviders).optional().or(z.literal("")),
  providerMeetingId: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
});
export type MeetingProviderInput = z.infer<typeof meetingProviderSchema>;
