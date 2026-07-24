"use client";

import { useState } from "react";
import TagPicker from "@/components/TagPicker";
import RoutineDetailModal from "@/components/RoutineDetailModal";
import type { Routine } from "@/types";

const CARD_STYLES = [
  "bg-primary-fixed-dim/30 border-primary-fixed text-on-primary-fixed-variant",
  "bg-tertiary-fixed/40 border-tertiary-fixed text-on-tertiary-fixed-variant",
  "bg-secondary-fixed-dim/30 border-secondary-fixed text-on-secondary-fixed-variant",
];

type StatusFilter = "active" | "archived" | "all";

export default function RoutinesClient({ initialRoutines }: { initialRoutines: Routine[] }) {
  const [routines, setRoutines] = useState<Routine[]>(initialRoutines);
  const [newTitle, setNewTitle] = useState("");
  const [newTags, setNewTags] = useState<string[]>([]);
  const [selected, setSelected] = useState<Routine | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");

  async function load() {
    const res = await fetch("/api/routines");
    const data = await res.json();
    setRoutines(data.routines ?? []);
  }

  async function addRoutine() {
    if (!newTitle.trim()) return;
    await fetch("/api/routines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, tags: newTags }),
    });
    setNewTitle("");
    setNewTags([]);
    load();
  }

  const visibleRoutines = routines.filter((r) => statusFilter === "all" || r.status === statusFilter);

  return (
    <div className="p-container-padding">
      <div className="glass-panel rounded-[24px] p-6 mb-6">
        <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-primary-container">repeat</span>
          定例業務
        </h3>
        <p className="font-body-md text-body-md text-on-surface-variant mb-4">
          期限のない継続的な担当業務を管理します
        </p>

        <div className="flex flex-col md:flex-row gap-2 mb-4">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="例: 週次定例MTGの議事録作成"
            className="flex-1 bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary transition-colors"
          />
          <div className="flex-1">
            <TagPicker value={newTags} onChange={setNewTags} />
          </div>
          <button
            onClick={addRoutine}
            className="bg-primary text-on-primary rounded-lg px-4 py-2 text-sm font-bold whitespace-nowrap"
          >
            追加
          </button>
        </div>

        <div className="flex gap-2">
          {(["active", "archived", "all"] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold ${
                statusFilter === f ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"
              }`}
            >
              {f === "active" ? "対応中" : f === "archived" ? "アーカイブ" : "すべて"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleRoutines.length === 0 && (
          <p className="text-label-sm text-on-surface-variant col-span-full">今のところありません</p>
        )}
        {visibleRoutines.map((routine, i) => (
          <button
            key={routine.id}
            onClick={() => setSelected(routine)}
            className={`text-left rounded-xl p-5 border shadow-sm hover:shadow-md transition-shadow ${CARD_STYLES[i % CARD_STYLES.length]}`}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-body-lg text-body-lg">{routine.title}</h4>
              {routine.status === "archived" && (
                <span className="text-xs bg-surface/60 rounded-full px-2 py-0.5">アーカイブ</span>
              )}
            </div>
            <div className="bg-surface/60 rounded-lg p-3 mb-2 min-h-[50px]">
              <p className="text-sm text-on-surface-variant/80 italic">{routine.memo || "メモ: まだありません"}</p>
            </div>
            {routine.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {routine.tags.map((tag) => (
                  <span key={tag.id} className="text-xs bg-surface/60 rounded-full px-2 py-0.5">
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>

      {selected && (
        <RoutineDetailModal
          routine={selected}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            load();
          }}
          onDeleted={() => {
            setSelected(null);
            load();
          }}
        />
      )}
    </div>
  );
}
