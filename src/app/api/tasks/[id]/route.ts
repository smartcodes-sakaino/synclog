import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { getOrCreateTagsForUser } from "@/lib/tags";
import type { Task } from "@/types";

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
  const { tags, ...fields } = updateTaskSchema.parse(await request.json());

  const setClauses: string[] = ["updated_at = now()"];
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(fields)) {
    values.push(value);
    setClauses.push(`${key} = $${values.length}`);
  }
  if (fields.status === "done") {
    setClauses.push("completed_at = now()");
  } else if (fields.status) {
    setClauses.push("completed_at = null");
  }

  values.push(id, userId);
  const [task] = await query<Task>(
    `update tasks set ${setClauses.join(", ")} where id = $${values.length - 1} and user_id = $${values.length} returning *`,
    values
  );

  if (!task) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (tags) {
    await query("delete from task_tags where task_id = $1", [id]);
    const tagRows = await getOrCreateTagsForUser(userId, tags);
    if (tagRows.length > 0) {
      const valuesSql = tagRows.map((_, i) => `($1, $${i + 2})`).join(", ");
      await query(`insert into task_tags (task_id, tag_id) values ${valuesSql}`, [
        id,
        ...tagRows.map((t) => t.id),
      ]);
    }
  }

  return NextResponse.json({ task });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  await query("delete from tasks where id = $1 and user_id = $2", [id, userId]);
  return new NextResponse(null, { status: 204 });
}
