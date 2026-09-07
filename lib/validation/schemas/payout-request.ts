import { z } from "zod";

export const createPayoutRequestSchema = z.object({
  organizationId: z.string().uuid("Select an organization"),
  amount: z
    .string()
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, "Enter an amount greater than 0"),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
});
export type CreatePayoutRequestInput = z.infer<typeof createPayoutRequestSchema>;
