import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth";
import { summarizeWorkItemsForDate } from "@/lib/dailyReportService";

const summarizeSchema = z.object({ date: z.string() });

// 「AIで生成」ボタン専用。ページ読み込み時には自動実行しない
export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = summarizeSchema.parse(await request.json());
  const workItems = await summarizeWorkItemsForDate(userId, body.date);
  return NextResponse.json({ workItems });
}
