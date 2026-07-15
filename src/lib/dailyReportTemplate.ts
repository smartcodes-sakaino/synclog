import type { WorkItem } from "@/types";

export const DAILY_REPORT_TO = "co_op@tcdigital.jp, nippo@tcdigital.jp";

function parseDateISO(dateISO: string): { year: string; month: string; day: string } {
  const match = dateISO.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error(`不正な日付形式です: ${dateISO}`);
  const [, year, month, day] = match;
  return { year, month, day };
}

// dateISO(YYYY-MM-DD)の文字列から直接組み立てる。
// Dateオブジェクト経由でformatすると、サーバーのシステムタイムゾーン(JSTでない場合)に
// 引っ張られて日付がずれるため、文字列のまま扱う
export function buildDailyReportSubject(dateISO: string): string {
  const { month, day } = parseDateISO(dateISO);
  return `【日報】${month}${day}_境野巧己`;
}

export function buildDailyReportBody(params: {
  dateISO: string;
  clockIn: string;
  clockOut: string;
  comment: string;
  workItems: WorkItem[];
}): string {
  const { dateISO, clockIn, clockOut, comment, workItems } = params;
  const { month, day } = parseDateISO(dateISO);
  const totalHours = workItems.reduce((sum, item) => sum + item.hours, 0);
  const workLines = workItems.map((item) => `- ${item.title}`).join("\n");

  return `各位

お疲れ様です。境野です。

${Number(month)}月${Number(day)}日の日報を送付いたします。


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
