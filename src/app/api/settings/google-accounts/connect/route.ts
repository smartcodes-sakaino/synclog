import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { buildAuthUrl, ACCOUNT_LINK_SCOPES } from "@/lib/google/oauth";
import { getCurrentUserId } from "@/lib/auth";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const state = randomBytes(16).toString("hex");
  const url = buildAuthUrl(ACCOUNT_LINK_SCOPES, `link:${state}`);
  const res = NextResponse.redirect(url);
  res.cookies.set("oauth_link_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
  });
  return res;
}
