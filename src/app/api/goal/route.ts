import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth";
import { getGoal, saveGoal } from "@/lib/goalService";

const updateGoalSchema = z.object({
  content: z.string().nullable(),
  periodStart: z.string().nullable(),
  periodEnd: z.string().nullable(),
});

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const goal = await getGoal(userId);
  return NextResponse.json({ goal });
}

export async function PATCH(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = updateGoalSchema.parse(await request.json());
  const goal = await saveGoal(userId, body.content, body.periodStart, body.periodEnd);
  return NextResponse.json({ goal });
}
