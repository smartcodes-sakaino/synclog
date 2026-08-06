import { query } from "@/lib/db";
import type { Skill } from "@/types";

export async function getSkillsForUser(userId: string): Promise<Skill[]> {
  return query<Skill>(
    "select * from skills where user_id = $1 order by category asc, sort_order asc, created_at asc",
    [userId]
  );
}
