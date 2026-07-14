"use client";

import { useEffect, useState } from "react";
import type { ExtractedTask, MinuteSource } from "@/types";

type SourceWithCount = MinuteSource & { extracted_task_count: number };

export default function MinutesClient() {
  const [docUrl, setDocUrl] = useState("");
  const [candidates, setCandidates] = useState<ExtractedTask[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sources, setSources] = useState<SourceWithCount[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recurringTitle, setRecurringTitle] = useState("");
  const [recurringUrl, setRecurringUrl] = useState("");

  async function loadSources() {
    const res = await fetch("/api/minutes/sources");
    const data = await res.json();
    setSources(data.sources ?? []);
  }

  useEffect(() => {
    loadSources();
  }, []);

  async function extract(url: string, minuteSourceId?: string) {
    setExtracting(true);
    setError(null);
    try {
      const res = await fetch("/api/minutes/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docUrl: url, minuteSourceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "抽出に失敗しました");
      setCandidates(data.extractedTasks ?? []);
      setSelected(new Set());
      loadSources();
    } catch (err) {
      setError(err instanceof Error ? err.message : "抽出に失敗しました");
    } finally {
      setExtracting(false);
    }
  }

  async function registerRecurring() {
    if (!recurringUrl.trim() || !recurringTitle.trim()) return;
    await fetch("/api/minutes/sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docUrl: recurringUrl, title: recurringTitle }),
    });
    setRecurringTitle("");
    setRecurringUrl("");
    loadSources();
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function importSelected() {
    if (selected.size === 0) return;
    await fetch("/api/minutes/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extractedTaskIds: [...selected] }),
    });
    setCandidates((prev) => prev.filter((c) => !selected.has(c.id)));
    setSelected(new Set());
  }

  return (
    <main className="flex-1 overflow-y-auto px-container-padding pb-container-padding flex flex-col lg:flex-row gap-8">
      <div className="flex-1 flex flex-col gap-8">
        <section className="bg-white rounded-[24px] p-8 shadow-sm">
          <h3 className="font-headline-md text-headline-md text-on-surface mb-4">議事録からのタスク抽出</h3>
          <p className="text-on-surface-variant font-body-md mb-6">
            定例MTGの議事録は自動チェック。単発の会議(Google Meetの自動生成議事録など)はURLを貼り付けてください。
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary">link</span>
              <input
                value={docUrl}
                onChange={(e) => setDocUrl(e.target.value)}
                placeholder="https://docs.google.com/..."
                className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-outline-variant focus:border-primary transition-colors"
              />
            </div>
            <button
              onClick={() => extract(docUrl)}
              disabled={extracting || !docUrl.trim()}
              className="bg-primary/90 text-on-primary font-bold py-3 px-8 rounded-xl shadow-sm hover:bg-primary transition-all whitespace-nowrap flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined">auto_awesome</span>
              {extracting ? "抽出中..." : "タスクを抽出"}
            </button>
          </div>
          {error && <p className="text-error text-sm mt-3">{error}</p>}
        </section>

        <section className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-headline-md text-headline-md text-on-surface">抽出されたタスク候補</h3>
            <span className="bg-primary-container text-on-primary-container font-label-sm py-1.5 px-4 rounded-full">{candidates.length}件見つかりました</span>
          </div>
          <div className="space-y-4">
            {candidates.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl p-6 card-shadow border-l-4 border-secondary-container flex items-start gap-4">
                <button onClick={() => toggleSelect(c.id)}>
                  <span className={`material-symbols-outlined rounded-full text-[24px] ${selected.has(c.id) ? "text-secondary-container" : "text-outline"}`}>
                    {selected.has(c.id) ? "check_circle" : "radio_button_unchecked"}
                  </span>
                </button>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-body-lg text-body-lg text-on-surface font-bold">{c.title}</h4>
                    <span className="flex items-center gap-1.5 text-primary font-label-sm bg-primary-fixed px-3 py-1.5 rounded-md">
                      <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                      {c.suggested_due_date ?? "期限なし"}
                    </span>
                  </div>
                  <p className="text-on-surface-variant font-body-md">{c.description}</p>
                </div>
              </div>
            ))}
            {candidates.length === 0 && <p className="text-on-surface-variant">まだ抽出結果はありません</p>}
          </div>
          {candidates.length > 0 && (
            <div className="mt-8 flex justify-end">
              <button onClick={importSelected} className="bg-secondary text-on-secondary font-bold py-3 px-8 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-2">
                <span className="material-symbols-outlined">check_circle</span>選択したタスクをインポート
              </button>
            </div>
          )}
        </section>
      </div>

      <aside className="w-full lg:w-80 flex flex-col gap-4">
        <div className="bg-white rounded-[24px] p-6 shadow-sm">
          <h4 className="font-body-lg text-body-lg text-on-surface font-bold mb-4">定例ドキュメントを登録</h4>
          <div className="flex flex-col gap-2">
            <input value={recurringTitle} onChange={(e) => setRecurringTitle(e.target.value)} placeholder="例: 週次定例MTG議事録" className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 text-sm" />
            <input value={recurringUrl} onChange={(e) => setRecurringUrl(e.target.value)} placeholder="https://docs.google.com/..." className="bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 text-sm" />
            <button onClick={registerRecurring} className="bg-primary text-on-primary rounded-lg py-2 text-sm font-bold">登録</button>
          </div>
        </div>

        <div className="bg-white rounded-[24px] p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-primary">history</span>
            <h3 className="font-body-lg text-body-lg text-on-surface font-bold">抽出履歴</h3>
          </div>
          <div className="space-y-6">
            {sources.map((s) => (
              <div key={s.id} className="flex flex-col gap-2 cursor-pointer group" onClick={() => extract(s.doc_url, s.id)}>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary text-[20px]">{s.type === "recurring" ? "description" : "videocam"}</span>
                  <h5 className="text-body-md font-bold text-on-surface truncate group-hover:text-primary transition-colors">{s.title ?? s.doc_url}</h5>
                </div>
                <div className="flex justify-between items-center pl-8">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${s.type === "recurring" ? "text-secondary bg-secondary-container" : "text-tertiary bg-tertiary-container"}`}>
                    {s.type === "recurring" ? "定例・自動" : "手動"}
                  </span>
                  <span className="text-xs font-bold text-on-surface bg-surface-container-high px-2 py-1 rounded-full">
                    {s.extracted_task_count} tasks
                  </span>
                </div>
              </div>
            ))}
            {sources.length === 0 && <p className="text-sm text-on-surface-variant">まだ履歴はありません</p>}
          </div>
        </div>
      </aside>
    </main>
  );
}
