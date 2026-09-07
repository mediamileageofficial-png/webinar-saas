import { z } from "zod";

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

export const formSettingsSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(200),
    description: optionalText(2000),
    successMessage: optionalText(1000),
    redirectUrl: optionalUrl,
    submitButtonText: z.string().trim().min(1).max(60).default("Register"),
    webinarId: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v : undefined)),
    isPaid: z.boolean().default(false),
    priceAmount: z.string().optional(),
    currency: z.string().trim().length(3).default("INR"),
  })
  .superRefine((data, ctx) => {
    if (data.isPaid) {
      const amount = Number(data.priceAmount);
      if (!data.priceAmount || Number.isNaN(amount) || amount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a price greater than 0 for a paid form",
          path: ["priceAmount"],
        });
      }
    }
  });
export type FormSettingsInput = z.infer<typeof formSettingsSchema>;

// Mirrors the `field_type` Postgres enum from 0001_core_schema.sql.
export const fieldTypes = [
  "full_name",
  "first_name",
  "last_name",
  "email",
  "mobile",
  "dob",
  "gender",
  "city",
  "state",
  "country",
  "education",
  "text",
  "textarea",
  "number",
  "dropdown",
  "radio",
  "checkbox",
  "date",
  "consent",
] as const;
export type FieldType = (typeof fieldTypes)[number];

export const OPTIONS_FIELD_TYPES: FieldType[] = ["dropdown", "radio", "checkbox"];

export const formFieldSchema = z
  .object({
    fieldType: z.enum(fieldTypes),
    fieldKey: z
      .string()
      .trim()
      .min(1, "Field key is required")
      .max(60)
      .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores only"),
    label: z.string().trim().min(1, "Label is required").max(200),
    placeholder: optionalText(200),
    helpText: optionalText(500),
    isRequired: z.boolean().default(false),
    optionsRaw: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (OPTIONS_FIELD_TYPES.includes(data.fieldType)) {
      const options = (data.optionsRaw ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      if (options.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Add at least one option (one per line)",
          path: ["optionsRaw"],
        });
      }
    }
  });
export type FormFieldInput = z.infer<typeof formFieldSchema>;

export function parseOptions(optionsRaw?: string): string[] {
  return (optionsRaw ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}
