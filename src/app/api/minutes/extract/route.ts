import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth";
import { extractTasksFromDocument } from "@/lib/minutesService";

const schema = z.object({
  docUrl: z.string().url(),
  minuteSourceId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = schema.parse(await request.json());
  try {
    const result = await extractTasksFromDocument(userId, body.docUrl, body.minuteSourceId);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "抽出に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
