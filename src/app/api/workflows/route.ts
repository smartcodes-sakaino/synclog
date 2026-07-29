import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { getWorkflowsForUser } from "@/lib/workflowsService";
import type { Workflow } from "@/types";

const createWorkflowSchema = z.object({
  title: z.string().min(1),
  to_emails: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
});

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const workflows = await getWorkflowsForUser(userId);
  return NextResponse.json({ workflows });
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = createWorkflowSchema.parse(await request.json());

  const [workflow] = await query<Workflow>(
    "insert into workflows (user_id, title, to_emails, subject, body) values ($1, $2, $3, $4, $5) returning *",
    [userId, body.title, body.to_emails, body.subject, body.body]
  );

  return NextResponse.json({ workflow }, { status: 201 });
}
