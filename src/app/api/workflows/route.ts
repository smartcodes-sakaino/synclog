import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { getWorkflowsForUser } from "@/lib/workflowsService";
import type { Workflow } from "@/types";

const createWorkflowSchema = z.object({
  kind: z.enum(["gmail_draft", "slack_create_channel", "train_delay"]).default("gmail_draft"),
  title: z.string().min(1),
  to_emails: z.string().optional(),
  subject: z.string().optional(),
  body: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional().default({}),
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
    `insert into workflows (user_id, kind, title, to_emails, subject, body, config)
     values ($1, $2, $3, $4, $5, $6, $7::jsonb)
     returning *`,
    [
      userId,
      body.kind,
      body.title,
      body.to_emails ?? null,
      body.subject ?? null,
      body.body ?? null,
      JSON.stringify(body.config),
    ]
  );

  return NextResponse.json({ workflow }, { status: 201 });
}
