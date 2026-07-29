import { absoluteUrl } from "@/lib/url";

// SyncLogが使うSlackのUser Token Scope。読み取り(検索・DM・メンション用)と
// 書き込み(チャンネル作成・招待用)の両方を含む
export const SLACK_USER_SCOPES = [
  "search:read",
  "channels:read",
  "groups:read",
  "im:read",
  "mpim:read",
  "channels:history",
  "groups:history",
  "im:history",
  "mpim:history",
  "channels:write",
  "channels:write.invites",
  "groups:write",
  "groups:write.invites",
  "users:read",
];

export function getSlackRedirectUri(): string {
  return absoluteUrl("/api/settings/slack/callback").toString();
}

export function buildSlackAuthUrl(state: string): string {
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) {
    throw new Error("SLACK_CLIENT_ID が設定されていません(Vercelの環境変数を確認してください)");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    user_scope: SLACK_USER_SCOPES.join(","),
    redirect_uri: getSlackRedirectUri(),
    state,
  });
  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

interface SlackOAuthAccessResponse {
  ok: boolean;
  error?: string;
  authed_user?: { id: string; access_token?: string; scope?: string };
  team?: { id: string; name: string };
}

export interface SlackTokenExchangeResult {
  accessToken: string;
  scope: string;
  slackUserId: string;
  workspaceId: string;
  workspaceName: string;
}

// 認可コードをUser Access Token(xoxp-)と交換する。token_rotationはOFFのため、
// Googleと違いリフレッシュトークンの管理は不要
export async function exchangeSlackCode(code: string): Promise<SlackTokenExchangeResult> {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("SLACK_CLIENT_ID / SLACK_CLIENT_SECRET が設定されていません(Vercelの環境変数を確認してください)");
  }

  const res = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: getSlackRedirectUri(),
    }),
  });
  const data = (await res.json()) as SlackOAuthAccessResponse;

  if (!data.ok || !data.authed_user?.access_token || !data.team) {
    throw new Error(data.error ?? "Slackとのトークン交換に失敗しました");
  }

  return {
    accessToken: data.authed_user.access_token,
    scope: data.authed_user.scope ?? "",
    slackUserId: data.authed_user.id,
    workspaceId: data.team.id,
    workspaceName: data.team.name,
  };
}
