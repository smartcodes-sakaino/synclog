import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { getSkillsForUser } from "@/lib/skillsService";
import type { Skill } from "@/types";

const createSkillSchema = z.object({
  category: z.enum(["skill", "experience"]).default("skill"),
  title: z.string().min(1),
  description: z.string().optional(),
});

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const skills = await getSkillsForUser(userId);
  return NextResponse.json({ skills });
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = createSkillSchema.parse(await request.json());

  const [{ count }] = await query<{ count: number }>(
    "select count(*)::int as count from skills where user_id = $1 and category = $2",
    [userId, body.category]
  );

  const [skill] = await query<Skill>(
    "insert into skills (user_id, category, title, description, sort_order) values ($1, $2, $3, $4, $5) returning *",
    [userId, body.category, body.title, body.description ?? null, count]
  );

  return NextResponse.json({ skill }, { status: 201 });
}
