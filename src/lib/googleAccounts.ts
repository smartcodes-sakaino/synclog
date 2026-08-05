import { query } from "@/lib/db";
import type { GoogleAccount } from "@/types";

export type GoogleAccountWithTokens = GoogleAccount & {
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
};

export async function listGoogleAccountsForUser(userId: string): Promise<GoogleAccountWithTokens[]> {
  return query<GoogleAccountWithTokens>(
    "select * from google_accounts where user_id = $1 order by created_at asc",
    [userId]
  );
}

// 日報の祝日/有給判定などに使うメインアカウント(最初に連携したアカウント)を返す
export async function getPrimaryGoogleAccount(userId: string): Promise<GoogleAccountWithTokens | null> {
  const accounts = await listGoogleAccountsForUser(userId);
  return accounts[0] ?? null;
}

// OAuth同意画面が「テスト」公開のままだとリフレッシュトークンが7日で失効するため、
// 6日以上再連携していないアカウントがあれば警告バナーを出す判定に使う
export async function hasStaleGoogleConnection(userId: string): Promise<boolean> {
  const rows = await query<{ stale: boolean | null }>(
    `select bool_or(connected_at < now() - interval '6 days') as stale
     from google_accounts where user_id = $1`,
    [userId]
  );
  return rows[0]?.stale ?? false;
}
