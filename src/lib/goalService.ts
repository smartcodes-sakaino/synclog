import { query, queryOne } from "@/lib/db";
import type { Goal } from "@/types";

export async function getGoal(userId: string): Promise<Goal> {
  const existing = await queryOne<Goal>("select * from goals where user_id = $1", [userId]);
  if (existing) return existing;

  const [created] = await query<Goal>(
    "insert into goals (user_id) values ($1) on conflict (user_id) do update set user_id = excluded.user_id returning *",
    [userId]
  );
  return created;
}

export async function saveGoal(
  userId: string,
  content: string | null,
  periodStart: string | null,
  periodEnd: string | null
): Promise<Goal> {
  const [row] = await query<Goal>(
    `insert into goals (user_id, content, period_start, period_end, updated_at) values ($1, $2, $3, $4, now())
     on conflict (user_id) do update set
       content = excluded.content,
       period_start = excluded.period_start,
       period_end = excluded.period_end,
       updated_at = now()
     returning *`,
    [userId, content, periodStart, periodEnd]
  );
  return row;
}
