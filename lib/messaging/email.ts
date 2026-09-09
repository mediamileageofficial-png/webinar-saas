import "server-only";
import type { EmailProvider } from "./provider";
import { ResendEmailProvider } from "./resend";
import { Msg91EmailProvider } from "./msg91";

/**
 * Picks the email provider for a send. Resend wins when it's configured
 * (platform env or the org's own "email" credentials); otherwise MSG91's
 * email API is used when its domain + auth key are present. If neither is
 * set, a ResendEmailProvider is returned so the send fails with the same
 * "Email provider is not configured" message that gets logged today.
 */
export function getEmailProvider(
  emailCredentials?: Record<string, string> | null,
  msg91Credentials?: Record<string, string> | null
): EmailProvider {
  const resendConfigured = Boolean(
    emailCredentials?.apiKey || process.env.EMAIL_PROVIDER_API_KEY
  );
  if (resendConfigured) {
    return new ResendEmailProvider(emailCredentials);
  }

  const msg91EmailConfigured = Boolean(
    (msg91Credentials?.authKey || process.env.MSG91_AUTH_KEY) &&
      (msg91Credentials?.emailDomain || process.env.MSG91_EMAIL_DOMAIN) &&
      (msg91Credentials?.emailFrom || process.env.MSG91_EMAIL_FROM)
  );
  if (msg91EmailConfigured) {
    return new Msg91EmailProvider(msg91Credentials);
  }

  return new ResendEmailProvider(emailCredentials);
}
