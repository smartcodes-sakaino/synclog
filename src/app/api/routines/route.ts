import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { getOrCreateTagsForUser } from "@/lib/tags";
import { getRoutinesForUser } from "@/lib/routinesService";
import type { Routine } from "@/types";

const createRoutineSchema = z.object({
  title: z.string().min(1),
  memo: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const status = new URL(request.url).searchParams.get("status") ?? undefined;
  const routines = await getRoutinesForUser(userId, status);
  return NextResponse.json({ routines });
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = createRoutineSchema.parse(await request.json());

  const [routine] = await query<Routine>(
    "insert into routines (user_id, title, memo) values ($1, $2, $3) returning *",
    [userId, body.title, body.memo ?? null]
  );

  const tags = await getOrCreateTagsForUser(userId, body.tags);
  if (tags.length > 0) {
    const valuesSql = tags.map((_, i) => `($1, $${i + 2})`).join(", ");
    await query(`insert into routine_tags (routine_id, tag_id) values ${valuesSql}`, [
      routine.id,
      ...tags.map((t) => t.id),
    ]);
  }

  return NextResponse.json({ routine: { ...routine, tags } }, { status: 201 });
}
