import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { ALLOWED_LOGIN_EMAIL } from "@/lib/auth";
import { generateDailyReport } from "@/lib/dailyReportService";
import { todayInJST } from "@/lib/date";

// 定時実行(外部cronサービス)専用エンドポイント。平日17:30(JST)に呼び出される想定
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = await queryOne<{ id: string }>("select id from users where email = $1", [
    ALLOWED_LOGIN_EMAIL,
  ]);

  if (!user) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  const dateISO = todayInJST();

  // 外部cronの誤設定や二重発火で同じ日に何度も下書きが作られないようにするガード
  // (手動の「今すぐ作成」ボタンはgenerateDailyReportを直接呼ぶため、この制限を受けない)
  const existing = await queryOne<{ status: string }>(
    "select status from daily_reports where user_id = $1 and report_date = $2",
    [user.id, dateISO]
  );
  if (existing?.status === "draft_created") {
    return NextResponse.json({ result: { status: "draft_created", reason: "本日分は作成済みのためスキップ" } });
  }

  const result = await generateDailyReport(user.id, dateISO, { respectSkipRules: true });
  return NextResponse.json({ result });
}
