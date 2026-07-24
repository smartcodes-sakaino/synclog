import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { getRoutinesForUser } from "@/lib/routinesService";
import type { Routine } from "@/types";

const linkSchema = z.object({
  title: z.string().min(1),
  url: z.string().min(1),
});

const createRoutineSchema = z.object({
  title: z.string().min(1),
  memo: z.string().optional(),
  links: z.array(linkSchema).default([]),
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
    "insert into routines (user_id, title, memo, links) values ($1, $2, $3, $4::jsonb) returning *",
    [userId, body.title, body.memo ?? null, JSON.stringify(body.links)]
  );

  return NextResponse.json({ routine }, { status: 201 });
}
