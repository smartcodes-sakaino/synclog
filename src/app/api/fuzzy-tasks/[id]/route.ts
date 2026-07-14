import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import type { FuzzyTask } from "@/types";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  memo: z.string().nullable().optional(),
  status: z.enum(["open", "resolved"]).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = updateSchema.parse(await request.json());

  const setClauses: string[] = ["updated_at = now()"];
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(body)) {
    values.push(value);
    setClauses.push(`${key} = $${values.length}`);
  }
  values.push(id, userId);

  const [fuzzyTask] = await query<FuzzyTask>(
    `update fuzzy_tasks set ${setClauses.join(", ")} where id = $${values.length - 1} and user_id = $${values.length} returning *`,
    values
  );

  if (!fuzzyTask) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ fuzzyTask });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  await query("delete from fuzzy_tasks where id = $1 and user_id = $2", [id, userId]);
  return new NextResponse(null, { status: 204 });
}
