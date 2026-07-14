import { google } from "googleapis";
import { query } from "@/lib/db";
import { decryptToken, encryptToken } from "@/lib/crypto";
import type { GoogleAccount } from "@/types";

// ログイン用スコープ(本人確認のみ)
export const LOGIN_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

// アカウント連携用スコープ(カレンダー/Gmail下書き/ドキュメント閲覧 + どのアカウントかを識別するためのメールアドレス取得)
export const ACCOUNT_LINK_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/documents.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
];

export function createOAuthClient(redirectUri?: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

// ログイン用とアカウント連携用でコールバック先のパスが異なるため、それぞれ別のリダイレクトURIを使う
export function getLoginRedirectUri(): string {
  return `${process.env.APP_BASE_URL}/api/auth/callback`;
}

export function getLinkRedirectUri(): string {
  return `${process.env.APP_BASE_URL}/api/settings/google-accounts/callback`;
}

export function buildAuthUrl(scopes: string[], state: string, redirectUri: string) {
  const client = createOAuthClient(redirectUri);
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
    const setClauses: string[] = [];
    const values: unknown[] = [];
    if (tokens.access_token) {
      setClauses.push(`access_token_encrypted = $${values.length + 1}`);
      values.push(encryptToken(tokens.access_token));
    }
    if (tokens.refresh_token) {
      setClauses.push(`refresh_token_encrypted = $${values.length + 1}`);
      values.push(encryptToken(tokens.refresh_token));
    }
    if (tokens.expiry_date) {
      setClauses.push(`token_expiry = $${values.length + 1}`);
      values.push(new Date(tokens.expiry_date).toISOString());
    }
    if (setClauses.length > 0) {
      values.push(account.id);
      await query(`update google_accounts set ${setClauses.join(", ")} where id = $${values.length}`, values);
    }
  });

  return client;
}
