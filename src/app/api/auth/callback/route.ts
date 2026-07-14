import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createOAuthClient } from "@/lib/google/oauth";
import { ALLOWED_LOGIN_EMAIL, findOrCreateUserByEmail } from "@/lib/auth";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expectedState = request.cookies.get("oauth_login_state")?.value;

  if (!code || !state || !expectedState || state !== `login:${expectedState}`) {
    return NextResponse.redirect(new URL("/login?error=invalid_state", request.url));
  }

  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data: profile } = await oauth2.userinfo.get();

  if (!profile.email || profile.email !== ALLOWED_LOGIN_EMAIL) {
    return NextResponse.redirect(new URL("/login?error=not_allowed", request.url));
  }

  const user = await findOrCreateUserByEmail(profile.email);

  const session = await getSession();
  session.userId = user.id;
  session.email = user.email;
  session.loggedInAt = Date.now();
  await session.save();

  const res = NextResponse.redirect(new URL("/", request.url));
  res.cookies.delete("oauth_login_state");
  return res;
}
