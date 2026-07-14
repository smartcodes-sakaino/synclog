import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { query } from "@/lib/db";
import { buildDailyReportPreview } from "@/lib/dailyReportService";
import { DAILY_REPORT_TO } from "@/lib/dailyReportTemplate";
import type { DailyReport } from "@/types";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date は必須です" }, { status: 400 });

  const preview = await buildDailyReportPreview(userId, date);

  const history = await query<DailyReport>(
    "select * from daily_reports where user_id = $1 order by report_date desc limit 10",
    [userId]
  );

  return NextResponse.json({
    preview: { ...preview, to: DAILY_REPORT_TO },
    history,
  });
}
