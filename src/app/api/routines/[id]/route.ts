import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import type { Routine } from "@/types";

const linkSchema = z.object({
  title: z.string().min(1),
  url: z.string().min(1),
});

const updateRoutineSchema = z.object({
  title: z.string().min(1).optional(),
  memo: z.string().nullable().optional(),
  status: z.enum(["active", "archived"]).optional(),
  links: z.array(linkSchema).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const { links, ...fields } = updateRoutineSchema.parse(await request.json());

  const setClauses: string[] = ["updated_at = now()"];
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(fields)) {
    values.push(value);
    setClauses.push(`${key} = $${values.length}`);
  }
  if (links !== undefined) {
    values.push(JSON.stringify(links));
    setClauses.push(`links = $${values.length}::jsonb`);
  }
  values.push(id, userId);

  const [routine] = await query<Routine>(
    `update routines set ${setClauses.join(", ")} where id = $${values.length - 1} and user_id = $${values.length} returning *`,
    values
  );

  if (!routine) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.json({ routine });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  await query("delete from routines where id = $1 and user_id = $2", [id, userId]);
  return new NextResponse(null, { status: 204 });
}
