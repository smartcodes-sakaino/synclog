import { query, queryOne } from "@/lib/db";
import type { UserLevel } from "@/types";

export async function getUserLevel(userId: string): Promise<UserLevel> {
  const existing = await queryOne<UserLevel>("select * from user_levels where user_id = $1", [userId]);
  if (existing) return existing;

  const [created] = await query<UserLevel>(
    "insert into user_levels (user_id) values ($1) on conflict (user_id) do update set user_id = excluded.user_id returning *",
    [userId]
  );
  return created;
}

export async function saveUserLevel(userId: string, level: number, reasoning: string): Promise<UserLevel> {
  const [row] = await query<UserLevel>(
    `insert into user_levels (user_id, level, reasoning, updated_at) values ($1, $2, $3, now())
     on conflict (user_id) do update set level = excluded.level, reasoning = excluded.reasoning, updated_at = now()
     returning *`,
    [userId, level, reasoning]
  );
  return row;
}
