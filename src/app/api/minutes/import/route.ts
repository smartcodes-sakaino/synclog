import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth";
import { query } from "@/lib/db";
import type { ExtractedTask, Task } from "@/types";

const schema = z.object({
  extractedTaskIds: z.array(z.string()).min(1),
});

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { extractedTaskIds } = schema.parse(await request.json());

  const candidates = await query<ExtractedTask>(
    `select * from extracted_tasks
     where user_id = $1 and id = any($2::uuid[]) and status = 'pending'`,
    [userId, extractedTaskIds]
  );

  if (candidates.length === 0) {
    return NextResponse.json({ tasks: [] });
  }

  const createdTasks: Task[] = [];
  for (const c of candidates) {
    const [task] = await query<Task>(
      `insert into tasks (user_id, title, description, due_date, source, source_ref)
       values ($1, $2, $3, $4, 'minutes_extraction', $5) returning *`,
      [userId, c.title, c.description, c.suggested_due_date, c.minute_source_id]
    );
    createdTasks.push(task);
  }

  await query(`update extracted_tasks set status = 'imported' where id = any($1::uuid[])`, [
    extractedTaskIds,
  ]);

  return NextResponse.json({ tasks: createdTasks }, { status: 201 });
}
