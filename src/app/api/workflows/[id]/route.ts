import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import type { Workflow } from "@/types";

const updateWorkflowSchema = z.object({
  title: z.string().min(1).optional(),
  to_emails: z.string().min(1).optional(),
  subject: z.string().min(1).optional(),
  body: z.string().min(1).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const fields = updateWorkflowSchema.parse(await request.json());

  const setClauses: string[] = ["updated_at = now()"];
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(fields)) {
    values.push(value);
    setClauses.push(`${key} = $${values.length}`);
  }
  values.push(id, userId);

  const [workflow] = await query<Workflow>(
    `update workflows set ${setClauses.join(", ")} where id = $${values.length - 1} and user_id = $${values.length} returning *`,
    values
  );

  if (!workflow) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ workflow });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  await query("delete from workflows where id = $1 and user_id = $2", [id, userId]);
  return new NextResponse(null, { status: 204 });
}
