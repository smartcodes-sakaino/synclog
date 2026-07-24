"use client";

import { useState } from "react";
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
      body: JSON.stringify({ title: newTitle }),
    });
    setNewTitle("");
    load();
  }

  const visibleRoutines = routines.filter((r) => statusFilter === "all" || r.status === statusFilter);

  return (
    <div className="p-container-padding">
      <div className="glass-panel rounded-[24px] p-6 mb-6">
        <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-primary-container">dashboard</span>
          Dashboard
        </h3>
        <p className="font-body-md text-body-md text-on-surface-variant mb-4">
          よく使うツールやドキュメントへのリンクをワークフローごとにまとめて管理します
        </p>

        <div className="flex flex-col md:flex-row gap-2 mb-4">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="例: 経費精算"
            className="flex-1 bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary transition-colors"
          />
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
          <div
            key={routine.id}
            className={`rounded-xl p-5 border shadow-sm hover:shadow-md transition-shadow ${CARD_STYLES[i % CARD_STYLES.length]}`}
          >
            <div className="flex items-center justify-between mb-2 cursor-pointer" onClick={() => setSelected(routine)}>
              <h4 className="font-body-lg text-body-lg">{routine.title}</h4>
              {routine.status === "archived" && (
                <span className="text-xs bg-surface/60 rounded-full px-2 py-0.5">アーカイブ</span>
              )}
            </div>
            <div
              className="bg-surface/60 rounded-lg p-3 mb-3 min-h-[50px] cursor-pointer"
              onClick={() => setSelected(routine)}
            >
              <p className="text-sm text-on-surface-variant/80 italic">{routine.memo || "概要: まだありません"}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              {routine.links.length === 0 && (
                <p className="text-xs text-on-surface-variant/60">リンクはまだ登録されていません</p>
              )}
              {routine.links.map((link, li) => (
                <a
                  key={li}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 text-sm bg-surface/60 rounded-lg px-3 py-1.5 hover:bg-surface transition-colors truncate"
                >
                  <span className="material-symbols-outlined text-[16px] flex-shrink-0">open_in_new</span>
                  <span className="truncate">{link.title}</span>
                </a>
              ))}
            </div>
          </div>
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
