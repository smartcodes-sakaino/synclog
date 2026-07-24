"use client";

import { useState } from "react";
import { format } from "date-fns";
import type { CalendarEvent } from "@/types";

type EventModalProps =
  | {
      mode: "create";
      defaultDate: Date;
      defaultStartTime?: string;
      defaultEndTime?: string;
      accounts: { id: string; email: string; colorKey: string }[];
      onClose: () => void;
      onSaved: () => void;
    }
  | {
      mode: "edit";
      existingEvent: CalendarEvent;
      onClose: () => void;
      onSaved: () => void;
      onDeleted: () => void;
    };

export default function EventModal(props: EventModalProps) {
  const isEdit = props.mode === "edit";
  const initialDate = isEdit ? props.existingEvent.start.slice(0, 10) : format(props.defaultDate, "yyyy-MM-dd");
  const initialAllDay = isEdit ? props.existingEvent.allDay : false;
  const initialStartTime = isEdit
    ? props.existingEvent.allDay
      ? "09:00"
      : props.existingEvent.start.slice(11, 16)
    : (props.defaultStartTime ?? "09:00");
  const initialEndTime = isEdit
    ? props.existingEvent.allDay
      ? "10:00"
      : props.existingEvent.end.slice(11, 16)
    : (props.defaultEndTime ?? "10:00");

  const [title, setTitle] = useState(isEdit ? props.existingEvent.title : "");
  const [date, setDate] = useState(initialDate);
  const [allDay, setAllDay] = useState(initialAllDay);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(
    !isEdit ? props.accounts.map((a) => a.id) : []
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleAccount(id: string) {
    setSelectedAccountIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  async function handleSave() {
    if (!title.trim()) return;
    if (!isEdit && selectedAccountIds.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const body = {
        title,
        date,
        allDay,
        startTime: allDay ? undefined : startTime,
        endTime: allDay ? undefined : endTime,
      };
      const res = isEdit
        ? await fetch(`/api/calendar/events/${encodeURIComponent(props.existingEvent.id)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/calendar/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...body, accountIds: selectedAccountIds }),
          });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail ? `${data.error}(${data.detail})` : data.error ?? "予定の保存に失敗しました");
      }
      props.onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "予定の保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!confirm("この予定を削除しますか？")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/calendar/events/${encodeURIComponent(props.existingEvent.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "予定の削除に失敗しました");
      }
      props.onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "予定の削除に失敗しました");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={props.onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md card-shadow" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-headline-md text-headline-md text-on-surface">{isEdit ? "予定を編集" : "予定を作成"}</h3>
          <button onClick={props.onClose} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="予定のタイトル"
            className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2"
          />

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2"
          />

          <label className="flex items-center gap-2 text-sm text-on-surface-variant">
            <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
            終日
          </label>

          {!allDay && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-label-sm text-on-surface-variant mb-1">開始</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-label-sm text-on-surface-variant mb-1">終了</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {isEdit ? (
            <p className="text-sm text-on-surface-variant">
              連携先アカウント: <span className="font-bold">{props.existingEvent.accountEmail}</span>
            </p>
          ) : (
            <div>
              <label className="block text-label-sm text-on-surface-variant mb-2">反映先アカウント</label>
              <div className="flex flex-col gap-2">
                {props.accounts.map((a) => (
                  <label key={a.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedAccountIds.includes(a.id)}
                      onChange={() => toggleAccount(a.id)}
                    />
                    {a.email}
                  </label>
                ))}
                {props.accounts.length === 0 && (
                  <p className="text-sm text-on-surface-variant">連携済みアカウントがありません</p>
                )}
              </div>
            </div>
          )}

          {error && <p className="text-error text-sm">{error}</p>}
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-outline-variant/20">
          {isEdit ? (
            <button onClick={handleDelete} disabled={deleting} className="text-error text-sm hover:underline disabled:opacity-50">
              {deleting ? "削除中..." : "削除する"}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={props.onClose} className="px-4 py-2 rounded-lg border border-outline-variant text-sm text-on-surface-variant">
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim() || (!isEdit && selectedAccountIds.length === 0)}
              className="px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-bold disabled:opacity-50"
            >
              {saving ? "保存中..." : isEdit ? "更新する" : "作成する"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
