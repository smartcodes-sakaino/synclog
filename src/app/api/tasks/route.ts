import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getCurrentUserId } from "@/lib/auth";
import { getOrCreateTagsForUser } from "@/lib/tags";
import type { Task } from "@/types";

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  tags: z.array(z.string()).default([]),
});

type TaskRow = Record<string, unknown> & {
  task_tags?: { tags: { id: string; name: string; color_key: string } | null }[];
};

function flattenTags(row: TaskRow): Task {
  const tags = (row.task_tags ?? [])
    .map((tt) => tt.tags)
    .filter((t): t is { id: string; name: string; color_key: string } => Boolean(t))
    .map((t) => ({ ...t, user_id: "", created_at: "" }));
  const { task_tags: _taskTags, ...rest } = row;
  void _taskTags;
  return { ...(rest as unknown as Task), tags: tags as Task["tags"] };
}

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const tag = searchParams.get("tag");

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("tasks")
    .select("*, task_tags(tags(id,name,color_key))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let tasks = (data ?? []).map(flattenTags);
  if (tag) tasks = tasks.filter((t) => t.tags.some((tg) => tg.name === tag));

  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = createTaskSchema.parse(await request.json());
  const supabase = getSupabaseAdmin();

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
      title: body.title,
      description: body.description ?? null,
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

  return NextResponse.json({ task: { ...task, tags } }, { status: 201 });
}
