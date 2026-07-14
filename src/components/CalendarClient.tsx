"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import type { CalendarEvent } from "@/types";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const ACCOUNT_DOT: Record<string, string> = {
  primary: "bg-primary-container border-primary/20 text-on-primary-container",
  secondary: "bg-secondary-container border-secondary/20 text-on-secondary-container",
  tertiary: "bg-tertiary-container border-tertiary/20 text-on-tertiary-container",
};

export default function CalendarClient() {
  const [month, setMonth] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [accounts, setAccounts] = useState<{ email: string; colorKey: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const rangeStart = startOfWeek(startOfMonth(month));
  const rangeEnd = endOfWeek(endOfMonth(month));
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

  useEffect(() => {
    setLoading(true);
    const start = startOfMonth(month).toISOString();
    const end = endOfMonth(month).toISOString();
    fetch(`/api/calendar/events?start=${start}&end=${end}`)
      .then((res) => res.json())
      .then((data) => {
        setEvents(data.events ?? []);
        setAccounts(data.accounts ?? []);
      })
      .finally(() => setLoading(false));
  }, [month]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const key = event.start.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    return map;
  }, [events]);

  const today = new Date();

  return (
    <main className="flex-grow p-container-padding flex flex-col gap-card-gap">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">カレンダー連携</h2>
          <p className="text-on-surface-variant mt-1">2つのGoogleアカウントの予定を1つのビューで管理。</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMonth(new Date())} className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors text-sm flex items-center gap-2 border border-outline-variant/30">
            <span className="material-symbols-outlined text-[18px]">today</span>今日
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <span className="font-label-sm text-label-sm text-on-surface-variant">同期アカウント:</span>
          <div className="flex flex-wrap gap-3">
            {accounts.map((a) => (
              <div key={a.email} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${ACCOUNT_DOT[a.colorKey] ?? ACCOUNT_DOT.primary}`}>
                <span className="w-3 h-3 rounded-full bg-current opacity-60" />
                <span className="font-label-sm text-label-sm">{a.email}</span>
              </div>
            ))}
            {accounts.length === 0 && !loading && (
              <a href="/settings" className="text-primary text-sm flex items-center gap-1 hover:underline">
                <span className="material-symbols-outlined text-[16px]">add_circle</span>アカウントを追加
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-2xl shadow-[0_8px_30px_rgba(134,78,90,0.06)] overflow-hidden border border-outline-variant/20 flex flex-col flex-grow">
        <div className="p-4 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low/50">
          <button onClick={() => setMonth((m) => subMonths(m, 1))} className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant">
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <h3 className="font-headline-md text-headline-md text-on-surface">{format(month, "yyyy年 M月")}</h3>
          <button onClick={() => setMonth((m) => addMonths(m, 1))} className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant">
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
        <div className="grid grid-cols-7 border-b border-outline-variant/20 bg-surface-container-lowest">
          {WEEKDAYS.map((d, i) => (
            <div key={d} className={`py-3 text-center font-label-sm text-label-sm ${i === 0 ? "text-error/80" : i === 6 ? "text-secondary/80" : "text-on-surface-variant"}`}>
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 flex-grow bg-outline-variant/10 gap-[1px]">
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayEvents = eventsByDay.get(key) ?? [];
            const isToday = isSameDay(day, today);
            const inMonth = isSameMonth(day, month);
            return (
              <div key={key} className={`bg-surface min-h-[110px] p-2 relative ${!inMonth ? "opacity-40" : ""}`}>
                {isToday ? (
                  <div className="absolute top-2 left-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center font-label-sm text-label-sm text-on-primary shadow-md z-10">
                    {format(day, "d")}
                  </div>
                ) : (
                  <div className="font-label-sm text-label-sm text-on-surface-variant mb-1">{format(day, "d")}</div>
                )}
                <div className={isToday ? "mt-6" : ""}>
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      className={`text-[11px] font-bold px-2 py-1 rounded truncate mb-1 border-l-2 ${ACCOUNT_DOT[event.accountColorKey] ?? ACCOUNT_DOT.primary}`}
                    >
                      {event.allDay ? "終日" : format(new Date(event.start), "HH:mm")} {event.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
