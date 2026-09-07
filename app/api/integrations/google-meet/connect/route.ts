import { NextResponse } from "next/server";
import { requireOrgRole, UnauthorizedError } from "@/lib/auth/guards";
import { createOAuthState } from "@/lib/integrations/google-oauth-state";

// Read-only access to conference records/participants for spaces the
// connected account organizes. NOTE: this alone cannot resolve a signed-in
// participant's email address - see lib/attendance-sync/google-meet.ts for
// why, and what this app does about it.
const GOOGLE_MEET_SCOPES = [
  "https://www.googleapis.com/auth/meetings.space.readonly",
  // Best-effort only: resolving participant emails requires the connecting
  // account to itself be a Workspace admin (or delegated directory reader).
  // Requesting this scope is harmless for personal Gmail accounts (Google
  // simply won't grant meaningful directory access) and enables email
  // resolution for the subset of tenants where it can work.
  "https://www.googleapis.com/auth/admin.directory.user.readonly",
].join(" ");

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orgSlug = url.searchParams.get("orgSlug");
  if (!orgSlug) {
    return NextResponse.json({ error: "orgSlug is required" }, { status: 400 });
  }

  try {
    const membership = await requireOrgRole(orgSlug, ["organization_owner"]);

    const clientId = process.env.GOOGLE_MEET_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_MEET_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: "Google Meet integration is not configured on this platform." },
        { status: 500 }
      );
    }

    const state = createOAuthState({
      organizationId: membership.organizationId,
      orgSlug,
    });

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", GOOGLE_MEET_SCOPES);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", state);

    return NextResponse.redirect(authUrl.toString());
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "Could not start Google Meet connection." },
      { status: 500 }
    );
  }
}
