import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { buildAuthUrl, getLinkRedirectUri, ACCOUNT_LINK_SCOPES } from "@/lib/google/oauth";
import { getCurrentUserId } from "@/lib/auth";
import { absoluteUrl } from "@/lib/url";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.redirect(absoluteUrl("/login"));
  }

  try {
    const state = randomBytes(16).toString("hex");
    const url = buildAuthUrl(ACCOUNT_LINK_SCOPES, `link:${state}`, getLinkRedirectUri());
    const res = NextResponse.redirect(url);
    res.cookies.set("oauth_link_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
    });
    return res;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.redirect(
      absoluteUrl(`/settings?error=config_error&detail=${encodeURIComponent(message)}`)
    );
  }
}
