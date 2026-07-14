import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getCurrentUserId } from "@/lib/auth";
import { getOrCreateTagsForUser } from "@/lib/tags";

const promoteSchema = z.object({
  title: z.string().min(1),
  due_date: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  tags: z.array(z.string()).default([]),
});

// ふわふわタスクを内容確定のうえ通常タスクへ昇格させる
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = promoteSchema.parse(await request.json());
  const supabase = getSupabaseAdmin();

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      title: body.title,
      due_date: body.due_date ?? null,
      priority: body.priority,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const tags = await getOrCreateTagsForUser(userId, body.tags);
  if (tags.length > 0) {
    await supabase.from("task_tags").insert(tags.map((t) => ({ task_id: task.id, tag_id: t.id })));
  }

  await supabase
    .from("fuzzy_tasks")
    .update({ status: "resolved", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);

  return NextResponse.json({ task: { ...task, tags } }, { status: 201 });
}
