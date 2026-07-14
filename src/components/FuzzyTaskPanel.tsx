"use client";

import { useEffect, useState } from "react";
import type { FuzzyTask } from "@/types";

const CARD_STYLES = [
  "bg-primary-fixed-dim/30 border-primary-fixed text-on-primary-fixed-variant",
  "bg-tertiary-fixed/40 border-tertiary-fixed text-on-tertiary-fixed-variant",
  "bg-secondary-fixed-dim/30 border-secondary-fixed text-on-secondary-fixed-variant",
];

export default function FuzzyTaskPanel() {
  const [items, setItems] = useState<FuzzyTask[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/fuzzy-tasks?status=open");
    const data = await res.json();
    setItems(data.fuzzyTasks ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addFuzzyTask() {
    if (!newTitle.trim()) return;
    await fetch("/api/fuzzy-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });
    setNewTitle("");
    load();
  }

  return (
    <div className="glass-panel rounded-[24px] p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-primary-container">psychology_alt</span>
          ふわふわタスク
        </h3>
        <span className="bg-primary-container text-on-primary-container font-label-sm text-label-sm px-2 py-1 rounded-full">
          {items.length}件
        </span>
      </div>
      <p className="font-body-md text-body-md text-on-surface-variant mb-4">
        社長からのふんわりした依頼...詳細を確認しましょう！
      </p>

      <div className="flex gap-2 mb-4">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="例: あれ、いい感じにしといて"
          className="flex-1 bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary transition-colors"
        />
        <button
          onClick={addFuzzyTask}
          className="bg-primary text-on-primary rounded-lg px-3 py-2 text-sm font-bold"
        >
          追加
        </button>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto pr-2" style={{ maxHeight: 500 }}>
        {!loading && items.length === 0 && (
          <p className="text-label-sm text-on-surface-variant">今のところありません</p>
        )}
        {items.map((item, i) => (
          <div
            key={item.id}
            className={`rounded-xl p-5 border shadow-sm ${CARD_STYLES[i % CARD_STYLES.length]}`}
          >
            <h4 className="font-body-lg text-body-lg mb-2">「{item.title}」</h4>
            <div className="bg-surface/60 rounded-lg p-3 mb-4 min-h-[60px]">
              <p className="text-sm text-on-surface-variant/80 italic">
                {item.memo || "メモ: まだありません"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
