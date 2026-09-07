import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

function getSecret(): string {
  const secret = process.env.GOOGLE_OAUTH_STATE_SECRET;
  if (!secret) {
    throw new Error("GOOGLE_OAUTH_STATE_SECRET is not configured.");
  }
  return secret;
}

export interface OAuthStatePayload {
  organizationId: string;
  orgSlug: string;
}

/**
 * Signs a short-lived state parameter carrying which org initiated the
 * Google OAuth consent flow. Without this, the callback would have no
 * trustworthy way to know which organization's credentials to save the
 * resulting tokens under - an attacker could otherwise craft a callback
 * request that attaches their own Google grant to someone else's org, or
 * vice versa.
 */
export function createOAuthState(payload: OAuthStatePayload): string {
  const data = JSON.stringify({ ...payload, nonce: Date.now() });
  const encoded = Buffer.from(data).toString("base64url");
  const signature = createHmac("sha256", getSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyOAuthState(state: string): OAuthStatePayload | null {
  const parts = state.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;

  const expectedSignature = createHmac("sha256", getSecret()).update(encoded).digest("base64url");
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString());
    if (typeof parsed.nonce !== "number" || Date.now() - parsed.nonce > STATE_MAX_AGE_MS) {
      return null;
    }
    return { organizationId: parsed.organizationId, orgSlug: parsed.orgSlug };
  } catch {
    return null;
  }
}
