import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { buildAuthUrl, getLoginRedirectUri, LOGIN_SCOPES } from "@/lib/google/oauth";
import { absoluteUrl } from "@/lib/url";

export async function GET() {
  try {
    const state = randomBytes(16).toString("hex");
    const url = buildAuthUrl(LOGIN_SCOPES, `login:${state}`, getLoginRedirectUri());
    const res = NextResponse.redirect(url);
    res.cookies.set("oauth_login_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.redirect(
      absoluteUrl(`/login?error=config_error&detail=${encodeURIComponent(message)}`)
    );
  }
}
