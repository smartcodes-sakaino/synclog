import { format } from "date-fns";
import type { WorkItem } from "@/types";

export const DAILY_REPORT_TO = "co_op@tcdigital.jp, nippo@tcdigital.jp";

export function buildDailyReportSubject(reportDate: Date): string {
  const mm = format(reportDate, "MM");
  const dd = format(reportDate, "dd");
  return `【日報】${mm}${dd}_境野巧己`;
}

export function buildDailyReportBody(params: {
  reportDate: Date;
  clockIn: string;
  clockOut: string;
  comment: string;
  workItems: WorkItem[];
}): string {
  const { reportDate, clockIn, clockOut, comment, workItems } = params;
  const month = format(reportDate, "M");
  const day = format(reportDate, "d");
  const totalHours = workItems.reduce((sum, item) => sum + item.hours, 0);
  const workLines = workItems.map((item) => `- ${item.title}`).join("\n");

  return `各位

お疲れ様です。境野です。

${month}月${day}日の日報を送付いたします。


■本日の出社/退社（予定）時間：${clockIn}/${clockOut}
■報告事項・コメント
${comment}

■本日の作業内容（${totalHours.toFixed(1)}h）
${workLines}
--
＊--------------------------------------------------------＊
株式会社テクノデジタル
境野 巧己
〒107-0062　東京都港区南青山7-1-5 コラム南青山 5F
https://www.tcdigital.jp/
Tel：03-6450-6040
Fax：03-6450-6041
E-mail：t.sakaino@tcdigital.jp
＊--------------------------------------------------------＊`;
}
