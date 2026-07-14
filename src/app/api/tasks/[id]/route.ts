import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getCurrentUserId } from "@/lib/auth";
import { getOrCreateTagsForUser } from "@/lib/tags";

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  status: z.enum(["todo", "in_progress", "done"]).optional(),
  tags: z.array(z.string()).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = updateTaskSchema.parse(await request.json());
  const supabase = getSupabaseAdmin();

  const { tags, ...fields } = body;
  const updatePayload: Record<string, unknown> = { ...fields, updated_at: new Date().toISOString() };
  if (fields.status === "done") updatePayload.completed_at = new Date().toISOString();
  if (fields.status && fields.status !== "done") updatePayload.completed_at = null;

  const { data: task, error } = await supabase
    .from("tasks")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (tags) {
    await supabase.from("task_tags").delete().eq("task_id", id);
    const tagRows = await getOrCreateTagsForUser(userId, tags);
    if (tagRows.length > 0) {
      await supabase.from("task_tags").insert(tagRows.map((t) => ({ task_id: id, tag_id: t.id })));
    }
  }

  return NextResponse.json({ task });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("tasks").delete().eq("id", id).eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
