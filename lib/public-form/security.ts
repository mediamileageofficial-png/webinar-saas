import { createHash } from "crypto";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 8;

const hits = new Map<string, number[]>();

/**
 * Best-effort, in-memory rate limiter keyed by (hashed) client IP + form.
 *
 * LIMITATION: this only protects a single serverless instance's memory - it
 * resets on cold start and does not coordinate across instances/regions. For
 * a real production deployment behind Vercel, replace this with a durable,
 * shared store (Upstash Redis, Vercel KV, or a Postgres-backed counter) so
 * limits are enforced consistently across instances. This is a legitimate
 * first line of defense for MVP, not a substitute for that.
 */
export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  timestamps.push(now);
  hits.set(key, timestamps);
  return timestamps.length > MAX_REQUESTS_PER_WINDOW;
}

export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}

/** We store a hash of the IP, never the raw address, per the DB schema's `ip_hash` column. */
export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}
