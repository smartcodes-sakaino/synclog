import { query } from "@/lib/db";
import type { Task } from "@/types";

// タスク一覧をタグ情報付きで取得する(優先度>期限>作成日時の順)
export async function getTasksForUser(userId: string, status?: string): Promise<Task[]> {
  const params: unknown[] = [userId];
  let statusClause = "";
  if (status) {
    params.push(status);
    statusClause = `and t.status = $${params.length}`;
  }

  return query<Task>(
    `select t.*,
       coalesce(json_agg(json_build_object('id', tg.id, 'name', tg.name, 'color_key', tg.color_key))
         filter (where tg.id is not null), '[]') as tags
     from tasks t
     left join task_tags tt on tt.task_id = t.id
     left join tags tg on tg.id = tt.tag_id
     where t.user_id = $1 ${statusClause}
     group by t.id
     order by
       case t.priority when 'high' then 1 when 'medium' then 2 else 3 end,
       t.due_date asc nulls last,
       t.created_at desc`,
    params
  );
}
