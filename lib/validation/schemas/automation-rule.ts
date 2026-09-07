import { z } from "zod";
import { automationTriggers } from "@/lib/automation/triggers";
import { messageChannels, templateKeys } from "@/lib/validation/schemas/message-template";

export const automationRuleSchema = z
  .object({
    webinarId: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
    trigger: z.enum(automationTriggers),
    offsetMinutes: z.string().optional(),
    channel: z.enum(messageChannels),
    templateKey: z.enum(templateKeys),
  })
  .superRefine((data, ctx) => {
    if (data.trigger === "before_webinar" || data.trigger === "after_webinar") {
      const n = Number(data.offsetMinutes);
      if (data.offsetMinutes === undefined || data.offsetMinutes === "" || Number.isNaN(n)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a number of minutes for this trigger.",
          path: ["offsetMinutes"],
        });
      } else if (data.trigger === "before_webinar" && n <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Use a positive number of minutes before the webinar (e.g. 1440 for 24 hours).",
          path: ["offsetMinutes"],
        });
      } else if (data.trigger === "after_webinar" && n <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Use a positive number of minutes after the webinar ends.",
          path: ["offsetMinutes"],
        });
      }
    }
  });
export type AutomationRuleInput = z.infer<typeof automationRuleSchema>;
