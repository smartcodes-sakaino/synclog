"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import CreateEventModal from "@/components/CreateEventModal";
import type { CalendarEvent } from "@/types";

type ViewMode = "month" | "week" | "day";

// 仕事用の画面のため、0時からではなく8時から表示する
const DAY_VIEW_START_HOUR = 8;
const HOURS = Array.from({ length: 24 - DAY_VIEW_START_HOUR }, (_, i) => i + DAY_VIEW_START_HOUR);

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const ACCOUNT_DOT: Record<string, string> = {
  primary: "bg-primary-container border-primary/20 text-on-primary-container",
  secondary: "bg-secondary-container border-secondary/20 text-on-secondary-container",
  tertiary: "bg-tertiary-container border-tertiary/20 text-on-tertiary-container",
};

export default function CalendarClient() {
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [accounts, setAccounts] = useState<{ id: string; email: string; colorKey: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (viewMode === "month") {
      return { rangeStart: startOfWeek(startOfMonth(currentDate)), rangeEnd: endOfWeek(endOfMonth(currentDate)) };
    }
    if (viewMode === "week") {
      return { rangeStart: startOfWeek(currentDate), rangeEnd: endOfWeek(currentDate) };
    }
    return { rangeStart: startOfDay(currentDate), rangeEnd: endOfDay(currentDate) };
  }, [viewMode, currentDate]);

  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

  function loadEvents() {
    setLoading(true);
    const start = rangeStart.toISOString();
    const end = rangeEnd.toISOString();
    return fetch(`/api/calendar/events?start=${start}&end=${end}`)
      .then((res) => res.json())
      .then((data) => {
        setEvents(data.events ?? []);
        setAccounts(data.accounts ?? []);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStart.getTime(), rangeEnd.getTime()]);

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

  function goPrev() {
    if (viewMode === "month") setCurrentDate((d) => subMonths(d, 1));
    else if (viewMode === "week") setCurrentDate((d) => subWeeks(d, 1));
    else setCurrentDate((d) => subDays(d, 1));
  }

  function goNext() {
    if (viewMode === "month") setCurrentDate((d) => addMonths(d, 1));
    else if (viewMode === "week") setCurrentDate((d) => addWeeks(d, 1));
    else setCurrentDate((d) => addDays(d, 1));
  }

  const headerLabel =
    viewMode === "month"
      ? format(currentDate, "yyyy年 M月")
      : viewMode === "week"
        ? `${format(rangeStart, "yyyy年M月d日")} 〜 ${format(rangeEnd, "M月d日")}`
        : format(currentDate, "yyyy年M月d日(EEEEEE)");

  return (
    <main className="flex-grow p-container-padding flex flex-col gap-card-gap">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">カレンダー連携</h2>
          <p className="text-on-surface-variant mt-1">2つのGoogleアカウントの予定を1つのビューで管理。</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">add_circle</span>予定を作成
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors text-sm flex items-center gap-2 border border-outline-variant/30">
            <span className="material-symbols-outlined text-[18px]">today</span>今日
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <span className="font-label-sm text-label-sm text-on-surface-variant">同期アカウント:</span>
          <div className="flex flex-wrap gap-3">
            {accounts.map((a) => (
              <div key={a.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${ACCOUNT_DOT[a.colorKey] ?? ACCOUNT_DOT.primary}`}>
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
          <button onClick={goPrev} className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant">
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <h3 className="font-headline-md text-headline-md text-on-surface">{headerLabel}</h3>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg overflow-hidden border border-outline-variant/30 bg-surface">
              {(["月", "週", "日"] as const).map((label, i) => {
                const mode = (["month", "week", "day"] as const)[i];
                return (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1.5 text-sm font-label-sm ${
                      viewMode === mode ? "bg-primary-container text-on-primary-container font-bold" : "hover:bg-surface-container"
                    } ${i > 0 ? "border-l border-outline-variant/30" : ""}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <button onClick={goNext} className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>

        {viewMode === "month" && (
          <>
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
                const inMonth = isSameMonth(day, currentDate);
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
                        <div key={event.id} className={`text-[11px] font-bold px-2 py-1 rounded truncate mb-1 border-l-2 ${ACCOUNT_DOT[event.accountColorKey] ?? ACCOUNT_DOT.primary}`}>
                          {event.allDay ? "終日" : format(new Date(event.start), "HH:mm")} {event.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {viewMode === "week" && (
          <div className="grid grid-cols-7 flex-grow bg-outline-variant/10 gap-[1px]">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayEvents = eventsByDay.get(key) ?? [];
              const isToday = isSameDay(day, today);
              return (
                <div key={key} className="bg-surface min-h-[400px] p-2 flex flex-col gap-1">
                  <div className={`text-center pb-2 mb-1 border-b border-outline-variant/10 ${isToday ? "text-primary font-bold" : "text-on-surface-variant"}`}>
                    <p className="font-label-sm text-label-sm">{WEEKDAYS[day.getDay()]}</p>
                    <p className="text-body-lg text-body-lg">{format(day, "d")}</p>
                  </div>
                  {dayEvents.map((event) => (
                    <div key={event.id} className={`text-xs font-bold px-2 py-1.5 rounded border-l-2 ${ACCOUNT_DOT[event.accountColorKey] ?? ACCOUNT_DOT.primary}`}>
                      <p>{event.allDay ? "終日" : format(new Date(event.start), "HH:mm")}</p>
                      <p className="truncate font-normal">{event.title}</p>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {viewMode === "day" && (() => {
          const dayEvents = eventsByDay.get(format(currentDate, "yyyy-MM-dd")) ?? [];
          const allDayEvents = dayEvents.filter((e) => e.allDay);
          const timedEvents = dayEvents.filter((e) => !e.allDay);
          const eventsByHour = new Map<number, CalendarEvent[]>();
          for (const event of timedEvents) {
            const hour = new Date(event.start).getHours();
            if (!eventsByHour.has(hour)) eventsByHour.set(hour, []);
            eventsByHour.get(hour)!.push(event);
          }

          return (
            <div className="flex flex-col">
              {allDayEvents.length > 0 && (
                <div className="p-4 border-b border-outline-variant/20 flex flex-wrap gap-2 bg-surface-container-lowest">
                  {allDayEvents.map((event) => (
                    <span key={event.id} className={`text-xs font-bold px-3 py-1.5 rounded-full border-l-2 ${ACCOUNT_DOT[event.accountColorKey] ?? ACCOUNT_DOT.primary}`}>
                      終日・{event.title}
                    </span>
                  ))}
                </div>
              )}
              {loading && <p className="text-on-surface-variant text-sm p-6">読み込み中...</p>}
              {!loading && dayEvents.length === 0 && (
                <p className="text-on-surface-variant text-sm p-6">この日の予定はありません</p>
              )}
              {!loading && timedEvents.length > 0 && (
                <div className="h-[600px] overflow-y-auto">
                  {HOURS.map((hour) => (
                    <div key={hour} className="flex border-b border-outline-variant/10 min-h-[56px]">
                      <div className="w-16 flex-shrink-0 py-2 px-2 text-right font-label-sm text-label-sm text-on-surface-variant border-r border-outline-variant/10">
                        {String(hour).padStart(2, "0")}:00
                      </div>
                      <div className="flex-1 p-2 flex flex-col gap-1.5">
                        {(eventsByHour.get(hour) ?? []).map((event) => (
                          <div key={event.id} className={`text-sm px-3 py-1.5 rounded-lg border-l-2 bg-surface-container-lowest card-shadow ${ACCOUNT_DOT[event.accountColorKey] ?? ACCOUNT_DOT.primary}`}>
                            <span className="font-bold">{format(new Date(event.start), "HH:mm")}</span> {event.title}
                            <span className="ml-2 text-xs text-on-surface-variant">{event.accountEmail}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {showCreateModal && (
        <CreateEventModal
          defaultDate={currentDate}
          accounts={accounts}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadEvents();
          }}
        />
      )}
    </main>
  );
}
