import { NextResponse } from "next/server";
import { verifyOAuthState } from "@/lib/integrations/google-oauth-state";
import { saveOrgCredentials } from "@/lib/integrations/credentials";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (error) {
    return NextResponse.redirect(`${appUrl}/settings?googleMeetError=${encodeURIComponent(error)}`);
  }
  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/settings?googleMeetError=missing_code`);
  }

  // The state param is the ONLY thing telling us which org this consent
  // belongs to - it must be verified before we trust anything else here.
  const statePayload = verifyOAuthState(state);
  if (!statePayload) {
    return NextResponse.redirect(`${appUrl}/settings?googleMeetError=invalid_state`);
  }

  const clientId = process.env.GOOGLE_MEET_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_MEET_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_MEET_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.redirect(
      `${appUrl}/${statePayload.orgSlug}/settings?googleMeetError=not_configured`
    );
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json().catch(() => null);

    if (!tokenRes.ok || !tokenData?.access_token) {
      throw new Error(tokenData?.error_description || "Google token exchange failed.");
    }

    // Google only returns a refresh_token on the FIRST consent for a given
    // client/user pair (or when prompt=consent forces re-issuance, which
    // the connect route always sets) - if for some reason it's missing,
    // this connection can't self-refresh later and the org will need to
    // reconnect once the short-lived access token expires.
    const refreshToken: string | undefined = tokenData.refresh_token;
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

    const result = await saveOrgCredentials(statePayload.organizationId, "google_meet", {
      accessToken: tokenData.access_token,
      refreshToken: refreshToken ?? "",
      expiresAt,
    });

    if (result.error) {
      throw new Error(result.error);
    }

    return NextResponse.redirect(
      `${appUrl}/${statePayload.orgSlug}/settings?googleMeetConnected=1`
    );
  } catch (err) {
    console.error("[google-meet/callback]", err);
    return NextResponse.redirect(
      `${appUrl}/${statePayload.orgSlug}/settings?googleMeetError=token_exchange_failed`
    );
  }
}
