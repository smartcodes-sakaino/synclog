import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createOAuthClient, getLoginRedirectUri } from "@/lib/google/oauth";
import { ALLOWED_LOGIN_EMAIL, findOrCreateUserByEmail } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { absoluteUrl } from "@/lib/url";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expectedState = request.cookies.get("oauth_login_state")?.value;

  if (!code || !state || !expectedState || state !== `login:${expectedState}`) {
    return NextResponse.redirect(absoluteUrl("/login?error=invalid_state"));
  }

  const redirectUri = getLoginRedirectUri();
  const client = createOAuthClient(redirectUri);
  let profileEmail: string | null | undefined;
  try {
    const { tokens } = await client.getToken({ code, redirect_uri: redirectUri });
    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data: profile } = await oauth2.userinfo.get();
    profileEmail = profile.email;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("Google login token exchange failed:", message);
    return NextResponse.redirect(
      absoluteUrl(`/login?error=token_exchange_failed&detail=${encodeURIComponent(message)}`)
    );
  }

  if (!profileEmail || profileEmail !== ALLOWED_LOGIN_EMAIL) {
    return NextResponse.redirect(absoluteUrl("/login?error=not_allowed"));
  }

  const user = await findOrCreateUserByEmail(profileEmail);

  const session = await getSession();
  session.userId = user.id;
  session.email = user.email;
  session.loggedInAt = Date.now();
  await session.save();

  const res = NextResponse.redirect(absoluteUrl("/"));
  res.cookies.delete("oauth_login_state");
  return res;
}
