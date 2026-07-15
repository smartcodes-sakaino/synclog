import { isJapaneseHoliday, isOnPaidLeave } from "@/lib/google/calendar";
import type { GoogleAccount } from "@/types";

type AccountRow = GoogleAccount & {
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
};

export interface SkipCheckResult {
  shouldSkip: boolean;
  reason: string | null;
}

// dateISO(YYYY-MM-DD、JSTの暦日)の曜日を、サーバーのシステムタイムゾーンに依存せず判定する
function getDayOfWeek(dateISO: string): number {
  return new Date(`${dateISO}T00:00:00Z`).getUTCDay();
}

// 平日17:30の自動生成をスキップすべきか判定する
// (優先度: 週末 > 祝日 > 有給休暇)
export async function checkShouldSkipDailyReport(
  primaryAccount: AccountRow,
  dateISO: string
): Promise<SkipCheckResult> {
  const dayOfWeek = getDayOfWeek(dateISO);
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { shouldSkip: true, reason: "週末のため" };
  }

  if (await isJapaneseHoliday(primaryAccount, dateISO)) {
    return { shouldSkip: true, reason: "日本の祝日のため" };
  }

  if (await isOnPaidLeave(primaryAccount, dateISO)) {
    return { shouldSkip: true, reason: "有給休暇のため" };
  }

  return { shouldSkip: false, reason: null };
}
