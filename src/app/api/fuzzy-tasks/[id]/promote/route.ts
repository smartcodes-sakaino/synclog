import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { getOrCreateTagsForUser } from "@/lib/tags";
import type { Task } from "@/types";

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

  const [task] = await query<Task>(
    `insert into tasks (user_id, title, due_date, priority) values ($1, $2, $3, $4) returning *`,
    [userId, body.title, body.due_date ?? null, body.priority]
  );

  const tags = await getOrCreateTagsForUser(userId, body.tags);
  if (tags.length > 0) {
    const valuesSql = tags.map((_, i) => `($1, $${i + 2})`).join(", ");
    await query(`insert into task_tags (task_id, tag_id) values ${valuesSql}`, [
      task.id,
      ...tags.map((t) => t.id),
    ]);
  }

  await query(
    "update fuzzy_tasks set status = 'resolved', updated_at = now() where id = $1 and user_id = $2",
    [id, userId]
  );

  return NextResponse.json({ task: { ...task, tags } }, { status: 201 });
}
