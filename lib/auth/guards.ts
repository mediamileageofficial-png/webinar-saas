import {
  getMembershipForOrgSlug,
  isPlatformAdmin,
  type OrgMembership,
  type OrgRole,
} from "@/lib/auth/session";

export class UnauthorizedError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Ensures the current user belongs to the org identified by `orgSlug` and
 * (optionally) holds one of `allowedRoles`. Throws UnauthorizedError otherwise.
 * Every server action / route handler that mutates tenant data should call
 * this before touching the database - never trust an org id from the client.
 */
export async function requireOrgRole(
  orgSlug: string,
  allowedRoles?: OrgRole[]
): Promise<OrgMembership> {
  const membership = await getMembershipForOrgSlug(orgSlug);
  if (!membership) {
    throw new UnauthorizedError("Not a member of this organization");
  }
  if (allowedRoles && !allowedRoles.includes(membership.role)) {
    throw new UnauthorizedError("Insufficient role for this action");
  }
  return membership;
}

export async function requirePlatformAdmin(): Promise<void> {
  const ok = await isPlatformAdmin();
  if (!ok) {
    throw new UnauthorizedError("Platform admin access required");
  }
}
