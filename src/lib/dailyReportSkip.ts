import { getDay } from "date-fns";
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

// 平日17:30の自動生成をスキップすべきか判定する
// (優先度: 週末 > 祝日 > 有給休暇)
export async function checkShouldSkipDailyReport(
  primaryAccount: AccountRow,
  dateISO: string,
  targetDate: Date
): Promise<SkipCheckResult> {
  const dayOfWeek = getDay(targetDate);
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
