import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createOAuthClient } from "@/lib/google/oauth";
import { encryptToken } from "@/lib/crypto";
import { getCurrentUserId } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

const ACCOUNT_COLOR_CYCLE = ["primary", "secondary", "tertiary"];

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

  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data: profile } = await oauth2.userinfo.get();

  if (!profile.email || !tokens.refresh_token) {
    return NextResponse.redirect(new URL("/settings?error=no_refresh_token", request.url));
  }

  const supabase = getSupabaseAdmin();
  const { count } = await supabase
    .from("google_accounts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const colorKey = ACCOUNT_COLOR_CYCLE[(count ?? 0) % ACCOUNT_COLOR_CYCLE.length];

  const { error } = await supabase.from("google_accounts").upsert(
    {
      user_id: userId,
      google_email: profile.email,
      account_label: profile.email,
      color_key: colorKey,
      access_token_encrypted: tokens.access_token ? encryptToken(tokens.access_token) : null,
      refresh_token_encrypted: encryptToken(tokens.refresh_token),
      token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      scopes: tokens.scope ?? null,
    },
    { onConflict: "user_id,google_email" }
  );

  if (error) {
    return NextResponse.redirect(new URL("/settings?error=save_failed", request.url));
  }

  const res = NextResponse.redirect(new URL("/settings", request.url));
  res.cookies.delete("oauth_link_state");
  return res;
}
