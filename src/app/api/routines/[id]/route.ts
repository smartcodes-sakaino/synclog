import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { getOrCreateTagsForUser } from "@/lib/tags";
import type { Routine } from "@/types";

const updateRoutineSchema = z.object({
  title: z.string().min(1).optional(),
  memo: z.string().nullable().optional(),
  status: z.enum(["active", "archived"]).optional(),
  tags: z.array(z.string()).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const { tags, ...fields } = updateRoutineSchema.parse(await request.json());

  const setClauses: string[] = ["updated_at = now()"];
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(fields)) {
    values.push(value);
    setClauses.push(`${key} = $${values.length}`);
  }
  values.push(id, userId);

  const [routine] = await query<Routine>(
    `update routines set ${setClauses.join(", ")} where id = $${values.length - 1} and user_id = $${values.length} returning *`,
    values
  );

  if (!routine) return NextResponse.json({ error: "not found" }, { status: 404 });

  let routineTags = undefined;
  if (tags) {
    await query("delete from routine_tags where routine_id = $1", [id]);
    routineTags = await getOrCreateTagsForUser(userId, tags);
    if (routineTags.length > 0) {
      const valuesSql = routineTags.map((_, i) => `($1, $${i + 2})`).join(", ");
      await query(`insert into routine_tags (routine_id, tag_id) values ${valuesSql}`, [
        id,
        ...routineTags.map((t) => t.id),
      ]);
    }
  }

  return NextResponse.json({ routine: routineTags ? { ...routine, tags: routineTags } : routine });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  await query("delete from routines where id = $1 and user_id = $2", [id, userId]);
  return new NextResponse(null, { status: 204 });
}
