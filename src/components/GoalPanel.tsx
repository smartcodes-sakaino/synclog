"use client";

import { useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { apiFetch } from "@/lib/apiClient";
import type { Goal } from "@/types";

function formatDate(dateISO: string | null): string {
  if (!dateISO) return "未設定";
  const [y, m, d] = dateISO.split("-");
  return `${y}/${m}/${d}`;
}

export default function GoalPanel({ initialGoal }: { initialGoal: Goal }) {
  const [goal, setGoal] = useState<Goal>(initialGoal);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(goal.content ?? "");
  const [periodStart, setPeriodStart] = useState(goal.period_start ?? "");
  const [periodEnd, setPeriodEnd] = useState(goal.period_end ?? "");
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  function startEdit() {
    setContent(goal.content ?? "");
    setPeriodStart(goal.period_start ?? "");
    setPeriodEnd(goal.period_end ?? "");
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    try {
      const data = await apiFetch<{ goal: Goal }>("/api/goal", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content || null,
          periodStart: periodStart || null,
          periodEnd: periodEnd || null,
        }),
      });
      setGoal(data.goal);
      setEditing(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div className="bg-white rounded-xl p-6 card-shadow border border-outline-variant/20 mx-container-padding mt-container-padding">
        <h3 className="font-headline-md text-headline-md text-on-surface mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">flag</span>今期の目標
        </h3>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="半年目標を入力してください"
          className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 text-sm resize-none mb-3"
          autoFocus
        />
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1">開始日</label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <span className="text-on-surface-variant pb-2">〜</span>
          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1">終了日</label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setEditing(false)}
            className="px-4 py-2 rounded-lg border border-outline-variant text-sm text-on-surface-variant"
          >
            キャンセル
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-bold disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存する"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 card-shadow border border-outline-variant/20 mx-container-padding mt-container-padding">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="font-headline-md text-headline-md text-on-surface mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">flag</span>今期の目標
          </h3>
          <p className="text-xs text-on-surface-variant mb-2">
            {formatDate(goal.period_start)} 〜 {formatDate(goal.period_end)}
          </p>
          <p className="font-body-md text-body-md text-on-surface whitespace-pre-line">
            {goal.content || "まだ目標が設定されていません"}
          </p>
        </div>
        <button onClick={startEdit} className="text-on-surface-variant/70 hover:text-on-surface flex-shrink-0">
          <span className="material-symbols-outlined text-[20px]">edit</span>
        </button>
      </div>
    </div>
  );
}
