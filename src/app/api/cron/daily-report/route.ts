import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { ALLOWED_LOGIN_EMAIL } from "@/lib/auth";
import { generateDailyReport } from "@/lib/dailyReportService";

function todayInJST(): string {
  const formatter = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" });
  return formatter.format(new Date()); // "YYYY-MM-DD"形式
}

// Vercel Cron専用エンドポイント。平日17:30(JST)に呼び出される
// (Vercel CronはデフォルトでGETリクエストを送信する)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data: user } = await supabase
    .from("users")
    .select("id")
    .eq("email", ALLOWED_LOGIN_EMAIL)
    .maybeSingle();

  if (!user) {
    return NextResponse.json({ error: "user not found" }, { status: 404 });
  }

  const dateISO = todayInJST();
  const result = await generateDailyReport(user.id, dateISO, { respectSkipRules: true });
  return NextResponse.json({ result });
}
