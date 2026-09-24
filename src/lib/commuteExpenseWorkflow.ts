import { listGoogleAccountsForUser } from "@/lib/googleAccounts";
import { listMergedEvents } from "@/lib/google/calendar";
import { currentYearMonthJST } from "@/lib/jstDate";
import type { CalendarEvent } from "@/types";

// entry IDはフォームのFB_PUBLIC_LOAD_DATA_を解析して取得したもの
const ENTRY = {
  name: 262800353,
  employeeNumber: 191684553,
  unit: 1535646184,
  targetMonth: 21598566,
  commuteMethod: 621088578,
  destination: 2083861560,
  purpose: 958418100,
  departure: 44711297,
  arrival: 1154634119,
  hasCommuterPass: 2002983790,
  fare: 120038780,
  fareChanged: 1730637634,
  // 「出勤日」(往復)。「片道出勤日」は別entryのため使わない
  roundTripAttendanceDays: 1649664492,
} as const;

const EMPLOYEE_NUMBER = "td240042";
const UNIT_NAME = "社長室";
const FULL_NAME = "境野巧己";
const COMMUTE_METHOD = "電車";
const DESTINATION = "南青山オフィス";
const PURPOSE = "出社";
const DEPARTURE_STATION = "戸田";
const ARRIVAL_STATION = "渋谷";
const HAS_COMMUTER_PASS = "いいえ";
const FARE = "440";
const FARE_CHANGED = "いいえ";

// カレンダー予定の「場所」にこの文字列が入っている日を出社日とみなす
const OFFICE_LOCATION = "02_東京本社";

function stripQuery(url: string): string {
  return url.split("?")[0];
}

function dayOfMonthJST(event: CalendarEvent): number {
  const dateOnly = event.allDay
    ? event.start
    : new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date(event.start));
  return Number(dateOnly.split("-")[2]);
}

// 今月のカレンダー予定から、勤務地が「02_東京本社」になっている日(出社日)を取得する
export async function getOfficeAttendanceDays(userId: string): Promise<number[]> {
  const { year, month } = currentYearMonthJST();
  const monthStr = String(month).padStart(2, "0");
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonthStr = String(nextMonth).padStart(2, "0");

  const accounts = await listGoogleAccountsForUser(userId);
  if (accounts.length === 0) return [];

  const events = await listMergedEvents(
    accounts,
    `${year}-${monthStr}-01T00:00:00+09:00`,
    `${nextYear}-${nextMonthStr}-01T00:00:00+09:00`
  );

  const days = new Set<number>();
  for (const event of events) {
    if ((event.location ?? "").trim() === OFFICE_LOCATION) {
      days.add(dayOfMonthJST(event));
    }
  }
  return [...days].sort((a, b) => a - b);
}

export async function buildCommuteExpenseFormUrl(userId: string, formBaseUrl: string): Promise<string> {
  const { month } = currentYearMonthJST();
  const attendanceDays = await getOfficeAttendanceDays(userId);

  const params = new URLSearchParams({
    usp: "pp_url",
    [`entry.${ENTRY.name}`]: FULL_NAME,
    [`entry.${ENTRY.employeeNumber}`]: EMPLOYEE_NUMBER,
    [`entry.${ENTRY.unit}`]: UNIT_NAME,
    [`entry.${ENTRY.targetMonth}`]: `${month}月`,
    [`entry.${ENTRY.commuteMethod}`]: COMMUTE_METHOD,
    [`entry.${ENTRY.destination}`]: DESTINATION,
    [`entry.${ENTRY.purpose}`]: PURPOSE,
    [`entry.${ENTRY.departure}`]: DEPARTURE_STATION,
    [`entry.${ENTRY.arrival}`]: ARRIVAL_STATION,
    [`entry.${ENTRY.hasCommuterPass}`]: HAS_COMMUTER_PASS,
    [`entry.${ENTRY.fare}`]: FARE,
    [`entry.${ENTRY.fareChanged}`]: FARE_CHANGED,
  });
  for (const day of attendanceDays) {
    params.append(`entry.${ENTRY.roundTripAttendanceDays}`, `${day}日`);
  }

  return `${stripQuery(formBaseUrl)}?${params.toString()}`;
}
