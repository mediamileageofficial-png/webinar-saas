import { z } from "zod";

export const messageChannels = ["sms", "whatsapp", "email"] as const;
export type MessageChannel = (typeof messageChannels)[number];

// Mirrors the example templates from the plan (Section 13).
export const templateKeys = [
  "registration_confirmation",
  "payment_confirmation",
  "reminder_24h",
  "reminder_1h",
  "reminder_15m",
  "webinar_starting",
  "thank_you",
  "no_show_followup",
  "course_followup",
] as const;
export type TemplateKey = (typeof templateKeys)[number];

export const TEMPLATE_KEY_LABELS: Record<TemplateKey, string> = {
  registration_confirmation: "Registration Confirmation",
  payment_confirmation: "Payment Confirmation",
  reminder_24h: "24 Hour Reminder",
  reminder_1h: "1 Hour Reminder",
  reminder_15m: "15 Minute Reminder",
  webinar_starting: "Webinar Starting",
  thank_you: "Thank You",
  no_show_followup: "No-show Follow-up",
  course_followup: "Course Follow-up",
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined));

export const messageTemplateSchema = z.object({
  key: z.enum(templateKeys),
  channel: z.enum(messageChannels),
  subject: optionalText(200),
  body: z.string().trim().min(1, "Body is required").max(5000),
  providerTemplateId: optionalText(200),
});
export type MessageTemplateInput = z.infer<typeof messageTemplateSchema>;
