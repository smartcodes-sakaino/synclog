import { google } from "googleapis";
import { getAuthorizedClientForAccount } from "@/lib/google/oauth";
import type { CalendarEvent, GoogleAccount } from "@/types";

const JAPAN_HOLIDAY_CALENDAR_ID = "ja.japanese#holiday@group.v.calendar.google.com";
const LEAVE_KEYWORDS = ["有給", "有休", "休暇"];

type AccountRow = GoogleAccount & {
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
};

export async function listMergedEvents(
  accounts: AccountRow[],
  timeMin: string,
  timeMax: string
): Promise<CalendarEvent[]> {
  const results: CalendarEvent[] = [];

  for (const account of accounts) {
    const auth = await getAuthorizedClientForAccount(account);
    const calendar = google.calendar({ version: "v3", auth });
    const res = await calendar.events.list({
      calendarId: "primary",
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
    });

    for (const event of res.data.items ?? []) {
      if (!event.id) continue;
      const start = event.start?.dateTime ?? event.start?.date ?? "";
      const end = event.end?.dateTime ?? event.end?.date ?? "";
      results.push({
        id: `${account.id}:${event.id}`,
        accountEmail: account.google_email,
        accountColorKey: account.color_key,
        title: event.summary ?? "(無題の予定)",
        start,
        end,
        allDay: !event.start?.dateTime,
      });
    }
  }

  return results.sort((a, b) => a.start.localeCompare(b.start));
}

export interface NewCalendarEvent {
  title: string;
  allDay: boolean;
  start: string; // allDay: "YYYY-MM-DD" / timed: ISO日時(タイムゾーン付き)
  end: string;
}

// 指定アカウントのプライマリカレンダーに予定を作成する
export async function createCalendarEvent(account: AccountRow, event: NewCalendarEvent): Promise<string> {
  const auth = await getAuthorizedClientForAccount(account);
  const calendar = google.calendar({ version: "v3", auth });

  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: event.title,
      start: event.allDay ? { date: event.start } : { dateTime: event.start },
      end: event.allDay ? { date: event.end } : { dateTime: event.end },
    },
  });

  if (!res.data.id) throw new Error("予定の作成に失敗しました");
  return res.data.id;
}

// 指定アカウントの既存の予定を更新する
export async function updateCalendarEvent(
  account: AccountRow,
  googleEventId: string,
  event: NewCalendarEvent
): Promise<void> {
  const auth = await getAuthorizedClientForAccount(account);
  const calendar = google.calendar({ version: "v3", auth });

  await calendar.events.patch({
    calendarId: "primary",
    eventId: googleEventId,
    requestBody: {
      summary: event.title,
      start: event.allDay ? { date: event.start } : { dateTime: event.start },
      end: event.allDay ? { date: event.end } : { dateTime: event.end },
    },
  });
}

// 指定アカウントの既存の予定を削除する
export async function deleteCalendarEvent(account: AccountRow, googleEventId: string): Promise<void> {
  const auth = await getAuthorizedClientForAccount(account);
  const calendar = google.calendar({ version: "v3", auth });
  await calendar.events.delete({ calendarId: "primary", eventId: googleEventId });
}

// 指定日が「日本の祝日」カレンダーに終日予定として登録されているか判定する
export async function isJapaneseHoliday(account: AccountRow, dateISO: string): Promise<boolean> {
  const auth = await getAuthorizedClientForAccount(account);
  const calendar = google.calendar({ version: "v3", auth });
  const res = await calendar.events.list({
    calendarId: JAPAN_HOLIDAY_CALENDAR_ID,
    timeMin: `${dateISO}T00:00:00+09:00`,
    timeMax: `${dateISO}T23:59:59+09:00`,
    singleEvents: true,
  });
  return (res.data.items?.length ?? 0) > 0;
}

// 本人カレンダーに指定日の終日予定があり、有給関連のキーワードを含むか判定する
export async function isOnPaidLeave(account: AccountRow, dateISO: string): Promise<boolean> {
  const auth = await getAuthorizedClientForAccount(account);
  const calendar = google.calendar({ version: "v3", auth });
  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: `${dateISO}T00:00:00+09:00`,
    timeMax: `${dateISO}T23:59:59+09:00`,
    singleEvents: true,
  });

  return (res.data.items ?? []).some((event) => {
    const isAllDay = !event.start?.dateTime;
    const title = event.summary ?? "";
    return isAllDay && LEAVE_KEYWORDS.some((keyword) => title.includes(keyword));
  });
}
