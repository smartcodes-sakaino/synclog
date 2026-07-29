import { NextRequest, NextResponse } from "next/server";
import { exchangeSlackCode } from "@/lib/slack/oauth";
import { encryptToken } from "@/lib/crypto";
import { getCurrentUserId } from "@/lib/auth";
import { query } from "@/lib/db";
import { absoluteUrl } from "@/lib/url";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.redirect(absoluteUrl("/login"));

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const expectedState = request.cookies.get("slack_oauth_state")?.value;

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(absoluteUrl("/settings?error=invalid_state"));
  }

  try {
    const result = await exchangeSlackCode(code);
    await query(
      `insert into slack_accounts
         (user_id, workspace_id, workspace_name, slack_user_id, access_token_encrypted, scopes)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (user_id, workspace_id) do update set
         workspace_name = excluded.workspace_name,
         slack_user_id = excluded.slack_user_id,
         access_token_encrypted = excluded.access_token_encrypted,
         scopes = excluded.scopes`,
      [
        userId,
        result.workspaceId,
        result.workspaceName,
        result.slackUserId,
        encryptToken(result.accessToken),
        result.scope,
      ]
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("Slack token exchange failed:", message);
    return NextResponse.redirect(
      absoluteUrl(`/settings?error=slack_token_exchange_failed&detail=${encodeURIComponent(message)}`)
    );
  }

  const res = NextResponse.redirect(absoluteUrl("/settings"));
  res.cookies.delete("slack_oauth_state");
  return res;
}
