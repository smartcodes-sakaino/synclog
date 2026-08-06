import { query } from "@/lib/db";
import { generateCompanionMessage } from "@/lib/gemini";
import { todayInJST, currentHourInJST } from "@/lib/date";
import { listGoogleAccountsForUser } from "@/lib/googleAccounts";
import { listMergedEvents } from "@/lib/google/calendar";
import type { CompanionContext } from "@/lib/gemini";

function timeOfDayInJST(hour: number): CompanionContext["timeOfDay"] {
  if (hour < 11) return "morning";
  if (hour < 17) return "midday";
  if (hour < 21) return "evening";
  return "night";
}

// ④(雑談枠)のテイストをランダムに切り替えるための候補。似たような褒め言葉の
// 繰り返しにならないよう、話の種類そのものを変える
const IDLE_MOODS = [
  "褒める(直近の行動や継続していることを具体的に評価する)",
  "軽い雑談(天気・季節・クマらしい豆知識など、仕事と関係ない話題)",
  "応援・励まし(これから頑張ろうという前向きな一言)",
  "ユーザーへの軽い問いかけ(調子や気分を尋ねるような一言)",
  "ねぎらい(具体的な成果ではなく、日々の積み重ねそのものへの労い)",
  "クマらしいひとりごと(のんびりした気持ちや、ふと思ったことをつぶやく)",
];

function pickIdleMood(): string {
  return IDLE_MOODS[Math.floor(Math.random() * IDLE_MOODS.length)];
}

function addDaysToISODate(dateISO: string, days: number): string {
  const d = new Date(`${dateISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// 明日が期限のタスク・明日の予定を取得する(定時前だけ呼ばれる。カレンダーAPIを毎回叩かないため)
async function getTomorrowContext(
  userId: string,
  tomorrowISO: string
): Promise<{ dueTitles: string[]; eventTitles: string[] }> {
  const [dueRows, accounts] = await Promise.all([
    query<{ title: string }>(
      "select title from tasks where user_id = $1 and due_date = $2 and status != 'done'",
      [userId, tomorrowISO]
    ),
    listGoogleAccountsForUser(userId),
  ]);

  let eventTitles: string[] = [];
  if (accounts.length > 0) {
    const events = await listMergedEvents(
      accounts,
      `${tomorrowISO}T00:00:00+09:00`,
      `${tomorrowISO}T23:59:59+09:00`
    );
    eventTitles = events.filter((e) => !e.allDay).map((e) => e.title);
  }

  return { dueTitles: dueRows.map((r) => r.title), eventTitles };
}

// 現在時刻が、連携済みカレンダーの何らかの予定(終日予定は除く)の最中かどうかを判定する。
// 会議中・作業中などにセリフ更新のAPI呼び出しを飛ばさないためのチェック用
export async function isCurrentlyBusy(userId: string): Promise<boolean> {
  const accounts = await listGoogleAccountsForUser(userId);
  if (accounts.length === 0) return false;

  const now = new Date();
  const nowISO = now.toISOString();
  const rangeStart = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const rangeEnd = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const events = await listMergedEvents(accounts, rangeStart, rangeEnd);
  return events.some((e) => !e.allDay && e.start <= nowISO && nowISO <= e.end);
}

export async function buildCompanionMessage(userId: string): Promise<string> {
  const dateISO = todayInJST();
  const hour = currentHourInJST();
  const start = `${dateISO}T00:00:00+09:00`;
  const end = `${dateISO}T23:59:59+09:00`;

  const [dueToday, completedToday] = await Promise.all([
    query<{ title: string }>(
      "select title from tasks where user_id = $1 and due_date = $2 and status != 'done'",
      [userId, dateISO]
    ),
    query<{ title: string }>(
      "select title from tasks where user_id = $1 and status = 'done' and completed_at >= $2 and completed_at <= $3",
      [userId, start, end]
    ),
  ]);

  // 定時(18時)が近い夕方の時間帯だけ、明日の予定・タスクも取得して声かけの材料にする
  const isNearEndOfDay = hour >= 16 && hour < 19;
  let tomorrowDueTitles: string[] = [];
  let tomorrowEventTitles: string[] = [];
  if (isNearEndOfDay) {
    const tomorrow = await getTomorrowContext(userId, addDaysToISODate(dateISO, 1));
    tomorrowDueTitles = tomorrow.dueTitles;
    tomorrowEventTitles = tomorrow.eventTitles;
  }

  // タスク関連の情報があっても、毎回それだけを話すと同じ話題の繰り返しになるため、
  // 45%の確率でのみ今回はタスクの話題にする(残りは雑談枠のテイストに任せる)
  const hasNotableInfo =
    dueToday.length > 0 || completedToday.length > 0 || tomorrowDueTitles.length > 0 || tomorrowEventTitles.length > 0;
  const focusOnUpdates = hasNotableInfo && Math.random() < 0.45;

  return generateCompanionMessage({
    timeOfDay: timeOfDayInJST(hour),
    dueTodayTitles: dueToday.map((t) => t.title),
    completedTodayTitles: completedToday.map((t) => t.title),
    tomorrowDueTitles,
    tomorrowEventTitles,
    idleMood: pickIdleMood(),
    focusOnUpdates,
  });
}
