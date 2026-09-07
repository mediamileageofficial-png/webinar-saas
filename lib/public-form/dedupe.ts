import { createHash, randomUUID } from "crypto";

/**
 * Computes a stable key used to prevent the same person from submitting the
 * same form twice (via a unique index on registrations(form_id, dedupe_key)).
 *
 * IMPORTANT: when a form has neither an email nor a mobile field, there is no
 * stable identity to dedupe against - hashing an empty string would make
 * every such submission collide with every other one, incorrectly blocking
 * the second person who ever fills out that form. In that case we return a
 * fresh random key per submission instead, which means "don't dedupe" rather
 * than "treat everyone as the same person".
 */
export function computeDedupeKey(values: { email?: string; mobile?: string }): string {
  const email = (values.email ?? "").trim().toLowerCase();
  const mobile = (values.mobile ?? "").replace(/\D/g, "");

  if (!email && !mobile) {
    return randomUUID();
  }

  const basis = email || mobile;
  return createHash("sha256").update(basis).digest("hex");
}
