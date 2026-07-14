import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { buildDailyReportPreview } from "@/lib/dailyReportService";
import { DAILY_REPORT_TO } from "@/lib/dailyReportTemplate";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date は必須です" }, { status: 400 });

  const preview = await buildDailyReportPreview(userId, date);

  const supabase = getSupabaseAdmin();
  const { data: history } = await supabase
    .from("daily_reports")
    .select("*")
    .eq("user_id", userId)
    .order("report_date", { ascending: false })
    .limit(10);

  return NextResponse.json({
    preview: { ...preview, to: DAILY_REPORT_TO },
    history: history ?? [],
  });
}
