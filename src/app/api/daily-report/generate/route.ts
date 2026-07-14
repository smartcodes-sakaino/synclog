import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth";
import { generateDailyReport } from "@/lib/dailyReportService";

const generateSchema = z.object({
  date: z.string(),
  comment: z.string().optional(),
  clockIn: z.string().optional(),
  clockOut: z.string().optional(),
  workItems: z.array(z.object({ title: z.string(), hours: z.number() })).optional(),
});

// 手動での「今すぐGmail下書きを作成」ボタン。スキップ判定を無視して強制実行する
export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = generateSchema.parse(await request.json());
  const result = await generateDailyReport(userId, body.date, {
    respectSkipRules: false,
    comment: body.comment,
    clockIn: body.clockIn,
    clockOut: body.clockOut,
    workItems: body.workItems,
  });

  if (result.status === "failed") {
    return NextResponse.json({ error: result.reason }, { status: 500 });
  }
  return NextResponse.json({ result });
}
