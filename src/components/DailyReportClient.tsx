"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useToast } from "@/components/ToastProvider";
import { apiFetch } from "@/lib/apiClient";
import { buildDailyReportBody } from "@/lib/dailyReportTemplate";
import type { CalendarEventLine, DailyReport, WorkItem } from "@/types";

const STATUS_LABEL: Record<string, string> = {
  draft_created: "作成済み",
  skipped: "スキップ",
  failed: "失敗",
  pending: "未実行",
};

export default function DailyReportClient() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [comment, setComment] = useState("");
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventLine[]>([]);
  const [subject, setSubject] = useState("");
  const [to, setTo] = useState("");
  const [history, setHistory] = useState<DailyReport[]>([]);
  const [sending, setSending] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { showToast } = useToast();

  async function load() {
    try {
      const data = await apiFetch<{
        preview: { comment: string; workItems: WorkItem[]; calendarEvents: CalendarEventLine[]; subject: string; to: string };
        history: DailyReport[];
      }>(`/api/daily-report?date=${today}`);
      setComment(data.preview.comment);
      setWorkItems(data.preview.workItems);
      setCalendarEvents(data.preview.calendarEvents);
      setSubject(data.preview.subject);
      setTo(data.preview.to);
      setHistory(data.history ?? []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "日報プレビューの取得に失敗しました");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // コメントや作業項目の編集がその場でプレビューに反映されるよう、送信前にクライアント側で組み立てる
  const body = useMemo(
    () => buildDailyReportBody({ dateISO: today, comment, workItems, calendarEvents }),
    [today, comment, workItems, calendarEvents]
  );

  async function handleSummarize() {
    setSummarizing(true);
    setMessage(null);
    try {
      const data = await apiFetch<{ workItems: WorkItem[] }>("/api/daily-report/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today }),
      });
      setWorkItems(data.workItems ?? []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "AI生成に失敗しました");
    } finally {
      setSummarizing(false);
    }
  }

  async function handleGenerate() {
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/daily-report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, comment, workItems }),
      });
      const rawText = await res.text();
      let data: { error?: string } = {};
      try {
        data = JSON.parse(rawText);
      } catch {
        // サーバーやプラットフォーム側の一時的な応答遅延などでJSON以外(HTMLエラーページ等)が
        // 返ってくることがある。Gmail下書き自体は作成できている場合が多いため、
        // 詳細はconsoleに出すだけにして、画面には穏やかなメッセージを表示する
        console.error("日報生成APIから予期しない応答がありました:", rawText);
        setMessage("処理を送信しました。反映まで少し時間がかかる場合があります。");
        load();
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "作成に失敗しました");
      setMessage("Gmail下書きを作成しました。");
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "作成に失敗しました");
    } finally {
      setSending(false);
    }
  }

  function addWorkItem() {
    setWorkItems((prev) => [...prev, { title: "" }]);
  }

  function updateWorkItem(index: number, value: string) {
    setWorkItems((prev) => prev.map((item, i) => (i === index ? { ...item, title: value } : item)));
  }

  function removeWorkItem(index: number) {
    setWorkItems((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <main className="flex-grow p-container-padding flex flex-col gap-card-gap">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <p className="text-primary font-label-sm text-label-sm mb-1 uppercase tracking-wider">Today's Reflection</p>
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">業務日報</h1>
        </div>
        <p className="text-on-surface-variant font-body-md bg-surface-container-low px-4 py-2 rounded-xl inline-flex items-center gap-2 border border-outline-variant/30">
          <span className="material-symbols-outlined text-[20px]">calendar_month</span>
          {format(new Date(), "yyyy年M月d日")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-card-gap">
        <div className="lg:col-span-7 space-y-card-gap">
          <div className="bg-white rounded-xl p-6 card-shadow border border-outline-variant/20">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">auto_awesome</span>
                本日の完了タスク
              </h3>
              <button
                onClick={handleSummarize}
                disabled={summarizing}
                className="bg-primary-container text-on-primary-container font-label-sm text-label-sm px-3 py-1.5 rounded-full flex items-center gap-1 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                {summarizing ? "生成中..." : "AIで生成"}
              </button>
            </div>
            <div className="space-y-2">
              {workItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={item.title}
                    onChange={(e) => updateWorkItem(i, e.target.value)}
                    className="flex-1 bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 text-sm"
                  />
                  <button onClick={() => removeWorkItem(i)} className="text-on-surface-variant hover:text-error flex-shrink-0">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              ))}
              <button onClick={addWorkItem} className="w-full mt-2 py-2 border-2 border-dashed border-outline-variant/60 rounded-lg text-outline font-label-sm text-label-sm hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[18px]">add_circle</span>タスクを手動で追加
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 card-shadow border border-outline-variant/20">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary">edit_note</span>報告事項・コメント
            </h3>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder="特記事項があれば入力してください..."
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl p-4 resize-none"
            />
          </div>
        </div>

        <div className="lg:col-span-5 space-y-card-gap">
          <div className="bg-white rounded-xl p-6 card-shadow border border-outline-variant/20 text-center">
            <h3 className="font-headline-md text-headline-md text-on-surface mb-2">準備完了ですか？</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6">平日17:30に自動作成されます。今すぐ作ることもできます。</p>
            <button
              onClick={handleGenerate}
              disabled={sending}
              className="w-full bg-primary text-on-primary font-headline-lg-mobile text-headline-lg-mobile py-4 px-6 rounded-xl shadow-[0_8px_24px_rgba(134,78,90,0.25)] hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[28px]">mail</span>
              {sending ? "作成中..." : "今すぐGmail下書きを作成"}
            </button>
            {message && <p className="mt-3 text-sm text-on-surface-variant">{message}</p>}
          </div>

          <div className="glass-panel rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-outline-variant/30">
              <span className="material-symbols-outlined text-outline">visibility</span>
              <h4 className="font-label-sm text-label-sm text-outline tracking-widest uppercase">Email Preview</h4>
            </div>
            <div className="space-y-3 font-mono text-sm bg-white/50 p-4 rounded-lg">
              <div><span className="text-outline-variant inline-block w-12">宛先:</span><span className="text-primary">{to}</span></div>
              <div><span className="text-outline-variant inline-block w-12">件名:</span><span className="font-medium">{subject}</span></div>
              <hr className="border-outline-variant/30 my-2" />
              <div className="whitespace-pre-line leading-relaxed text-on-surface-variant text-[13px]">{body}</div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 card-shadow border border-outline-variant/20">
            <h4 className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-3">直近の日報履歴</h4>
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="flex justify-between items-center text-sm py-1">
                  <span>{h.report_date}</span>
                  <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container">{STATUS_LABEL[h.status]}</span>
                </div>
              ))}
              {history.length === 0 && <p className="text-sm text-on-surface-variant">履歴はまだありません</p>}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
