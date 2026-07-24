import { query } from "@/lib/db";
import type { Routine } from "@/types";

// 定例業務(継続的な担当業務、期限なし)一覧をタグ情報付きで取得する
export async function getRoutinesForUser(userId: string, status?: string): Promise<Routine[]> {
  const params: unknown[] = [userId];
  let statusClause = "";
  if (status) {
    params.push(status);
    statusClause = `and r.status = $${params.length}`;
  }

  return query<Routine>(
    `select r.*,
       coalesce(json_agg(json_build_object('id', tg.id, 'name', tg.name, 'color_key', tg.color_key))
         filter (where tg.id is not null), '[]') as tags
     from routines r
     left join routine_tags rt on rt.routine_id = r.id
     left join tags tg on tg.id = rt.tag_id
     where r.user_id = $1 ${statusClause}
     group by r.id
     order by r.created_at desc`,
    params
  );
}
