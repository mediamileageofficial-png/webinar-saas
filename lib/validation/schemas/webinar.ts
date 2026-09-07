import { z } from "zod";

export const webinarStatuses = [
  "draft",
  "published",
  "registration_open",
  "registration_closed",
  "completed",
  "cancelled",
] as const;
export type WebinarStatus = (typeof webinarStatuses)[number];

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined));

const optionalUrl = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : undefined))
  .refine((v) => !v || /^https?:\/\//.test(v), {
    message: "Enter a valid URL starting with http:// or https://",
  });

export const webinarSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(200),
    description: optionalText(5000),
    eventDate: z.string().min(1, "Event date is required"),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    timezone: z.string().trim().min(1).max(64).default("Asia/Kolkata"),
    speakerName: optionalText(200),
    speakerDetails: optionalText(2000),
    platform: optionalText(100),
    joinUrl: optionalUrl,
    recordingUrl: optionalUrl,
  })
  .refine((data) => new Date(data.endTime).getTime() > new Date(data.startTime).getTime(), {
    message: "End time must be after start time",
    path: ["endTime"],
  });
export type WebinarInput = z.infer<typeof webinarSchema>;

/** Allowed forward transitions. Anything not listed here is rejected server-side. */
export const WEBINAR_STATUS_TRANSITIONS: Record<WebinarStatus, WebinarStatus[]> = {
  draft: ["published", "cancelled"],
  published: ["registration_open", "cancelled"],
  registration_open: ["registration_closed", "cancelled"],
  registration_closed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransitionWebinarStatus(
  from: WebinarStatus,
  to: WebinarStatus
): boolean {
  return WEBINAR_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
