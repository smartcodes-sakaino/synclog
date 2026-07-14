import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { ALLOWED_LOGIN_EMAIL } from "@/lib/auth";
import { generateDailyReport } from "@/lib/dailyReportService";

function todayInJST(): string {
  const formatter = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" });
  return formatter.format(new Date()); // "YYYY-MM-DD"形式
}

// 定時実行(Replit Scheduled Deployment)専用エンドポイント。平日17:30(JST)に呼び出される
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
  const result = await generateDailyReport(user.id, dateISO, { respectSkipRules: true });
  return NextResponse.json({ result });
}
