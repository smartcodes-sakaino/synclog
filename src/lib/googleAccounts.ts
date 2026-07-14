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
