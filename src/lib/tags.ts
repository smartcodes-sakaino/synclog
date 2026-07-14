import { getSupabaseAdmin } from "@/lib/supabase";
import { nextTagColor } from "@/lib/tagColors";
import type { Tag } from "@/types";

// タグ名の配列から、既存タグは再利用しつつ未登録タグは自動作成して返す
export async function getOrCreateTagsForUser(userId: string, tagNames: string[]): Promise<Tag[]> {
  const trimmed = [...new Set(tagNames.map((t) => t.trim()).filter(Boolean))];
  if (trimmed.length === 0) return [];

  const supabase = getSupabaseAdmin();
  const { data: existingTags } = await supabase
    .from("tags")
    .select("*")
    .eq("user_id", userId)
    .in("name", trimmed);

  const existingNames = new Set((existingTags ?? []).map((t) => t.name));
  const toCreate = trimmed.filter((name) => !existingNames.has(name));

  if (toCreate.length === 0) return existingTags ?? [];

  const { count: currentTagCount } = await supabase
    .from("tags")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const newTagRows = toCreate.map((name, index) => ({
    user_id: userId,
    name,
    color_key: nextTagColor((currentTagCount ?? 0) + index),
  }));

  const { data: createdTags, error } = await supabase.from("tags").insert(newTagRows).select("*");
  if (error) throw error;

  return [...(existingTags ?? []), ...(createdTags ?? [])];
}
