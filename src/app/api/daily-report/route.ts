import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth";
import { query } from "@/lib/db";
import { buildDailyReportPreview, saveDailyReportComment } from "@/lib/dailyReportService";
import { DAILY_REPORT_TO } from "@/lib/dailyReportTemplate";
import type { DailyReport } from "@/types";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date は必須です" }, { status: 400 });

  const [preview, history] = await Promise.all([
    buildDailyReportPreview(userId, date),
    query<DailyReport>("select * from daily_reports where user_id = $1 order by report_date desc limit 10", [
      userId,
    ]),
  ]);

  return NextResponse.json({
    preview: { ...preview, to: DAILY_REPORT_TO },
    history,
  });
}

const patchSchema = z.object({ date: z.string(), comment: z.string() });

// 「報告事項・コメント」の自動保存専用。Gmail下書きは作成しない
export async function PATCH(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = patchSchema.parse(await request.json());
  await saveDailyReportComment(userId, body.date, body.comment);
  return NextResponse.json({ ok: true });
}
