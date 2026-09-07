import { z } from "zod";

export const bankAccountSchema = z.object({
  accountHolderName: z
    .string()
    .trim()
    .min(2, "Enter the account holder's name")
    .max(200),
  accountNumber: z
    .string()
    .trim()
    .min(6, "Account number must be at least 6 characters")
    .max(40, "Account number must be at most 40 characters")
    .regex(/^[a-zA-Z0-9]+$/, "Account number must be alphanumeric"),
  ifscCode: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(
      z
        .string()
        .length(11, "IFSC must be exactly 11 characters")
        .regex(
          /^[A-Z]{4}0[A-Z0-9]{6}$/,
          "Invalid IFSC format (4 letters, then 0, then 6 alphanumeric characters)"
        )
    ),
});
export type BankAccountInput = z.infer<typeof bankAccountSchema>;
