import { query } from "@/lib/db";
import { nextTagColor } from "@/lib/tagColors";
import type { Tag } from "@/types";

// タグ名の配列から、既存タグは再利用しつつ未登録タグは自動作成して返す
export async function getOrCreateTagsForUser(userId: string, tagNames: string[]): Promise<Tag[]> {
  const trimmed = [...new Set(tagNames.map((t) => t.trim()).filter(Boolean))];
  if (trimmed.length === 0) return [];

  const existingTags = await query<Tag>(
    "select * from tags where user_id = $1 and name = any($2::text[])",
    [userId, trimmed]
  );

  const existingNames = new Set(existingTags.map((t) => t.name));
  const toCreate = trimmed.filter((name) => !existingNames.has(name));

  if (toCreate.length === 0) return existingTags;

  const [{ count }] = await query<{ count: number }>(
    "select count(*)::int as count from tags where user_id = $1",
    [userId]
  );

  const createdTags: Tag[] = [];
  for (let i = 0; i < toCreate.length; i++) {
    const [row] = await query<Tag>(
      "insert into tags (user_id, name, color_key, sort_order) values ($1, $2, $3, $4) returning *",
      [userId, toCreate[i], nextTagColor(count + i), count + i]
    );
    createdTags.push(row);
  }

  return [...existingTags, ...createdTags];
}
