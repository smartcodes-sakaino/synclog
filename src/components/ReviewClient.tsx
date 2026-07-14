"use client";

import { useState } from "react";
import { format, subMonths } from "date-fns";
import type { ReviewSummary } from "@/types";

const BAR_COLORS = ["bg-primary", "bg-secondary", "bg-tertiary", "bg-outline"];

export default function ReviewClient() {
  const [periodStart, setPeriodStart] = useState(format(subMonths(new Date(), 6), "yyyy-MM-dd"));
  const [periodEnd, setPeriodEnd] = useState(format(new Date(), "yyyy-MM-dd"));
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const res = await fetch("/api/review/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodStart, periodEnd }),
      });
      const data = await res.json();
      setSummary(data.reviewSummary);
    } finally {
      setLoading(false);
    }
  }

  async function copySummary() {
    if (summary) await navigator.clipboard.writeText(summary.summary_text);
  }

  return (
    <main className="flex-grow p-container-padding flex flex-col gap-card-gap">
      <div className="mb-2">
        <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">期間ごとの振り返り</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          定例報告や評価面談用に、選択した期間の作業実績をAIが要約します。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-card-gap">
        <div className="lg:col-span-8 space-y-card-gap">
          <div className="bg-surface-container-lowest rounded-xl p-6 flex flex-wrap gap-4 items-end shadow-sm">
            <div className="flex-1 min-w-[200px]">
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">開始日</label>
              <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-3" />
            </div>
            <div className="text-on-surface-variant pb-3 px-2 font-bold">—</div>
            <div className="flex-1 min-w-[200px]">
              <label className="block font-label-sm text-label-sm text-on-surface-variant mb-2">終了日</label>
              <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-3" />
            </div>
            <button onClick={generate} disabled={loading} className="bg-primary text-on-primary rounded-lg px-6 py-3 font-label-sm text-label-sm shadow hover:shadow-md transition-all h-[52px] disabled:opacity-50">
              {loading ? "生成中..." : "更新"}
            </button>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-outline-variant/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary-container/30 rounded-lg text-primary">
                <span className="material-symbols-outlined">auto_awesome</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface">AI 要約レポート</h3>
            </div>
            {summary ? (
              <div className="space-y-6 whitespace-pre-line text-body-md text-on-surface leading-relaxed">
                {summary.summary_text}
              </div>
            ) : (
              <p className="text-on-surface-variant">期間を指定して「更新」を押すと、要約が生成されます。</p>
            )}
            {summary && (
              <div className="mt-8 flex gap-3 pt-6">
                <button onClick={copySummary} className="flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-full text-sm hover:bg-primary-container/20 transition-colors">
                  <span className="material-symbols-outlined text-sm">content_copy</span>コピーする
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-card-gap">
          <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm">
            <h3 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-6">タグ別作業比率</h3>
            <div className="space-y-5">
              {(summary?.tag_breakdown ?? []).map((entry, i) => (
                <div key={entry.tag}>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-body-md text-on-surface font-medium">{entry.tag}</span>
                    <span className="text-label-sm text-on-surface-variant">{entry.percentage}%</span>
                  </div>
                  <div className="w-full bg-surface-variant h-2 rounded-full overflow-hidden">
                    <div className={`${BAR_COLORS[i % BAR_COLORS.length]} h-full rounded-full`} style={{ width: `${entry.percentage}%` }} />
                  </div>
                </div>
              ))}
              {(!summary || summary.tag_breakdown.length === 0) && (
                <p className="text-sm text-on-surface-variant">データがありません</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
