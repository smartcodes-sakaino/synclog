import { query } from "@/lib/db";
import type { Routine } from "@/types";

// Dashboard(よく使うリンクをまとめたワークフローカード)一覧を取得する
export async function getRoutinesForUser(userId: string, status?: string): Promise<Routine[]> {
  const params: unknown[] = [userId];
  let statusClause = "";
  if (status) {
    params.push(status);
    statusClause = `and status = $${params.length}`;
  }

  return query<Routine>(
    `select * from routines where user_id = $1 ${statusClause} order by created_at desc`,
    params
  );
}
