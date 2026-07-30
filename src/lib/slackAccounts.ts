import { query } from "@/lib/db";
import type { SlackAccount } from "@/types";

export type SlackAccountWithToken = SlackAccount & { access_token_encrypted: string };

export async function listSlackAccountsForUser(userId: string): Promise<SlackAccountWithToken[]> {
  return query<SlackAccountWithToken>(
    "select * from slack_accounts where user_id = $1 order by created_at asc",
    [userId]
  );
}

// 指定ワークスペースの連携アカウントを返す。指定が無い/見つからない場合は最初に連携したものを返す
export async function getSlackAccountForWorkspace(
  userId: string,
  workspaceId?: string
): Promise<SlackAccountWithToken | null> {
  const accounts = await listSlackAccountsForUser(userId);
  if (accounts.length === 0) return null;
  if (workspaceId) {
    return accounts.find((a) => a.workspace_id === workspaceId) ?? accounts[0];
  }
  return accounts[0];
}
