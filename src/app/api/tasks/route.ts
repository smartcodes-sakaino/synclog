import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { getOrCreateTagsForUser } from "@/lib/tags";
import { getTasksForUser } from "@/lib/tasksService";
import type { Task } from "@/types";

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  tags: z.array(z.string()).default([]),
});

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const tag = searchParams.get("tag");

  const tasks = await getTasksForUser(userId, status);
  const filtered = tag ? tasks.filter((t) => t.tags.some((tg) => tg.name === tag)) : tasks;

  return NextResponse.json({ tasks: filtered });
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = createTaskSchema.parse(await request.json());

  const [task] = await query<Task>(
    `insert into tasks (user_id, title, description, due_date, priority)
     values ($1, $2, $3, $4, $5) returning *`,
    [userId, body.title, body.description ?? null, body.due_date ?? null, body.priority]
  );

  const tags = await getOrCreateTagsForUser(userId, body.tags);
  if (tags.length > 0) {
    const valuesSql = tags.map((_, i) => `($1, $${i + 2})`).join(", ");
    await query(`insert into task_tags (task_id, tag_id) values ${valuesSql}`, [
      task.id,
      ...tags.map((t) => t.id),
    ]);
  }

  return NextResponse.json({ task: { ...task, tags } }, { status: 201 });
}
