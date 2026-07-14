import { google } from "googleapis";
import { getSupabaseAdmin } from "@/lib/supabase";
import { decryptToken, encryptToken } from "@/lib/crypto";
import type { GoogleAccount } from "@/types";

// ログイン用スコープ(本人確認のみ)
export const LOGIN_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

// アカウント連携用スコープ(カレンダー/Gmail下書き/ドキュメント閲覧)
export const ACCOUNT_LINK_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/documents.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
];

export function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_OAUTH_REDIRECT_URI
  );
}

export function buildAuthUrl(scopes: string[], state: string) {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
    state,
  });
}

// google_accountsの1レコード分について、有効なアクセストークンを持つ認証済みクライアントを返す
// 期限切れの場合はリフレッシュトークンで更新し、DBの暗号化トークンも更新する
export async function getAuthorizedClientForAccount(account: GoogleAccount & {
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
}) {
  const client = createOAuthClient();
  const refreshToken = account.refresh_token_encrypted
    ? decryptToken(account.refresh_token_encrypted)
    : undefined;
  const accessToken = account.access_token_encrypted
    ? decryptToken(account.access_token_encrypted)
    : undefined;

  client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: account.token_expiry ? new Date(account.token_expiry).getTime() : undefined,
  });

  client.on("tokens", async (tokens) => {
    const supabase = getSupabaseAdmin();
    const update: Record<string, unknown> = {};
    if (tokens.access_token) update.access_token_encrypted = encryptToken(tokens.access_token);
    if (tokens.refresh_token) update.refresh_token_encrypted = encryptToken(tokens.refresh_token);
    if (tokens.expiry_date) update.token_expiry = new Date(tokens.expiry_date).toISOString();
    if (Object.keys(update).length > 0) {
      await supabase.from("google_accounts").update(update).eq("id", account.id);
    }
  });

  return client;
}
