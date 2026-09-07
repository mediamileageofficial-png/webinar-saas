import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined));

export const organizationProfileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  logoUrl: optionalText(2000),
  contactEmail: z
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
  contactPhone: optionalText(30),
  timezone: z.string().trim().min(1).max(64),
  brandColor: optionalText(20),
});
export type OrganizationProfileInput = z.infer<typeof organizationProfileSchema>;

export const cashfreeCredentialsSchema = z.object({
  appId: z.string().trim().min(1, "App ID is required").max(200),
  secretKey: z.string().trim().min(1, "Secret key is required").max(500),
  webhookSecret: z.string().trim().min(1, "Webhook secret is required").max(500),
  env: z.enum(["sandbox", "production"]),
});
export type CashfreeCredentialsInput = z.infer<typeof cashfreeCredentialsSchema>;

export const msg91CredentialsSchema = z.object({
  authKey: z.string().trim().min(1, "Auth key is required").max(200),
  senderId: optionalText(20),
  integratedNumber: optionalText(30),
});
export type Msg91CredentialsInput = z.infer<typeof msg91CredentialsSchema>;

export const emailCredentialsSchema = z.object({
  apiKey: z.string().trim().min(1, "API key is required").max(500),
  fromAddress: z.string().trim().email("Enter a valid from-address"),
});
export type EmailCredentialsInput = z.infer<typeof emailCredentialsSchema>;
