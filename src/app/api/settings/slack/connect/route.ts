import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { buildSlackAuthUrl } from "@/lib/slack/oauth";
import { getCurrentUserId } from "@/lib/auth";
import { absoluteUrl } from "@/lib/url";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.redirect(absoluteUrl("/login"));

  try {
    const state = randomBytes(16).toString("hex");
    const url = buildSlackAuthUrl(state);
    const res = NextResponse.redirect(url);
    res.cookies.set("slack_oauth_state", state, {
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
