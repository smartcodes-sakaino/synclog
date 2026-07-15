"use client";

import { useState } from "react";
import { format } from "date-fns";

export default function CreateEventModal({
  defaultDate,
  accounts,
  onClose,
  onCreated,
}: {
  defaultDate: Date;
  accounts: { id: string; email: string; colorKey: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(format(defaultDate, "yyyy-MM-dd"));
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(accounts.map((a) => a.id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleAccount(id: string) {
    setSelectedAccountIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  async function handleCreate() {
    if (!title.trim() || selectedAccountIds.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          date,
          allDay,
          startTime: allDay ? undefined : startTime,
          endTime: allDay ? undefined : endTime,
          accountIds: selectedAccountIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "予定の作成に失敗しました");
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "予定の作成に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md card-shadow" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-headline-md text-headline-md text-on-surface">予定を作成</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-primary">
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

          <div>
            <label className="block text-label-sm text-on-surface-variant mb-2">反映先アカウント</label>
            <div className="flex flex-col gap-2">
              {accounts.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedAccountIds.includes(a.id)}
                    onChange={() => toggleAccount(a.id)}
                  />
                  {a.email}
                </label>
              ))}
              {accounts.length === 0 && (
                <p className="text-sm text-on-surface-variant">連携済みアカウントがありません</p>
              )}
            </div>
          </div>

          {error && <p className="text-error text-sm">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-outline-variant/20">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-outline-variant text-sm text-on-surface-variant">
            キャンセル
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !title.trim() || selectedAccountIds.length === 0}
            className="px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-bold disabled:opacity-50"
          >
            {saving ? "作成中..." : "作成する"}
          </button>
        </div>
      </div>
    </div>
  );
}
