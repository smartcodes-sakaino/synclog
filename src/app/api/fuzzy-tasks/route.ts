import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import type { FuzzyTask } from "@/types";

const createSchema = z.object({
  title: z.string().min(1),
  memo: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const status = new URL(request.url).searchParams.get("status");
  const params: unknown[] = [userId];
  let statusClause = "";
  if (status) {
    params.push(status);
    statusClause = `and status = $${params.length}`;
  }

  const fuzzyTasks = await query<FuzzyTask>(
    `select * from fuzzy_tasks where user_id = $1 ${statusClause} order by created_at desc`,
    params
  );
  return NextResponse.json({ fuzzyTasks });
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = createSchema.parse(await request.json());
  const [fuzzyTask] = await query<FuzzyTask>(
    "insert into fuzzy_tasks (user_id, title, memo) values ($1, $2, $3) returning *",
    [userId, body.title, body.memo ?? null]
  );

  return NextResponse.json({ fuzzyTask }, { status: 201 });
}
