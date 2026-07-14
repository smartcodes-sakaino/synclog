import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { buildAuthUrl, LOGIN_SCOPES } from "@/lib/google/oauth";

export async function GET() {
  const state = randomBytes(16).toString("hex");
  const url = buildAuthUrl(LOGIN_SCOPES, `login:${state}`);
  const res = NextResponse.redirect(url);
  res.cookies.set("oauth_login_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
  });
  return res;
}
