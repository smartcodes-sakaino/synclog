import { getSupabaseAdmin } from "@/lib/supabase";
import type { GoogleAccount } from "@/types";

export type GoogleAccountWithTokens = GoogleAccount & {
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
};

export async function listGoogleAccountsForUser(userId: string): Promise<GoogleAccountWithTokens[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("google_accounts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// 日報の祝日/有給判定などに使うメインアカウント(最初に連携したアカウント)を返す
export async function getPrimaryGoogleAccount(userId: string): Promise<GoogleAccountWithTokens | null> {
  const accounts = await listGoogleAccountsForUser(userId);
  return accounts[0] ?? null;
}
