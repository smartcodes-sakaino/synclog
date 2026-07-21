import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createOAuthClient, getLinkRedirectUri } from "@/lib/google/oauth";
import { encryptToken } from "@/lib/crypto";
import { getCurrentUserId } from "@/lib/auth";
import { query } from "@/lib/db";

const ACCOUNT_COLOR_CYCLE = ["primary", "secondary", "tertiary"];

interface OAuthTokens {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
  scope?: string;
}

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.redirect(new URL("/login", request.url));

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expectedState = request.cookies.get("oauth_link_state")?.value;

  if (!code || !state || !expectedState || state !== `link:${expectedState}`) {
    return NextResponse.redirect(new URL("/settings?error=invalid_state", request.url));
  }

  const redirectUri = getLinkRedirectUri();
  const client = createOAuthClient(redirectUri);
  let tokens: OAuthTokens;
  try {
    const result = await client.getToken({ code, redirect_uri: redirectUri });
    tokens = result.tokens;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("Google token exchange failed:", message);
    return NextResponse.redirect(
      new URL(`/settings?error=token_exchange_failed&detail=${encodeURIComponent(message)}`, request.url)
    );
  }
  client.setCredentials(tokens);

  let profileEmail: string | null | undefined;
  try {
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data: profile } = await oauth2.userinfo.get();
    profileEmail = profile.email;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("Google userinfo fetch failed:", message);
    return NextResponse.redirect(
      new URL(`/settings?error=userinfo_failed&detail=${encodeURIComponent(message)}`, request.url)
    );
  }

  if (!profileEmail || !tokens.refresh_token) {
    return NextResponse.redirect(new URL("/settings?error=no_refresh_token", request.url));
  }

  const [{ count }] = await query<{ count: number }>(
    "select count(*)::int as count from google_accounts where user_id = $1",
    [userId]
  );
  const colorKey = ACCOUNT_COLOR_CYCLE[count % ACCOUNT_COLOR_CYCLE.length];

  try {
    await query(
      `insert into google_accounts
         (user_id, google_email, account_label, color_key, access_token_encrypted, refresh_token_encrypted, token_expiry, scopes)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (user_id, google_email) do update set
         account_label = excluded.account_label,
         color_key = excluded.color_key,
         access_token_encrypted = excluded.access_token_encrypted,
         refresh_token_encrypted = excluded.refresh_token_encrypted,
         token_expiry = excluded.token_expiry,
         scopes = excluded.scopes`,
      [
        userId,
        profileEmail,
        profileEmail,
        colorKey,
        tokens.access_token ? encryptToken(tokens.access_token) : null,
        encryptToken(tokens.refresh_token),
        tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        tokens.scope ?? null,
      ]
    );
  } catch (err) {
    console.error("Failed to save google_accounts row:", err);
    return NextResponse.redirect(new URL("/settings?error=save_failed", request.url));
  }

  const res = NextResponse.redirect(new URL("/settings", request.url));
  res.cookies.delete("oauth_link_state");
  return res;
}
