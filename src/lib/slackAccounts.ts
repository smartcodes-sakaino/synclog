import { query } from "@/lib/db";
import type { SlackAccount } from "@/types";

export type SlackAccountWithToken = SlackAccount & { access_token_encrypted: string };

export async function listSlackAccountsForUser(userId: string): Promise<SlackAccountWithToken[]> {
  return query<SlackAccountWithToken>(
    "select * from slack_accounts where user_id = $1 order by created_at asc",
    [userId]
  );
}
