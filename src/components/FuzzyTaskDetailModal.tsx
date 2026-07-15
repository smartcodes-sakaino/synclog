"use client";

import { useState } from "react";
import TagPicker from "@/components/TagPicker";
import type { FuzzyTask, FuzzyTaskStatus, Priority } from "@/types";

export default function FuzzyTaskDetailModal({
  fuzzyTask,
  onClose,
  onSaved,
  onDeleted,
  onPromoted,
}: {
  fuzzyTask: FuzzyTask;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  onPromoted: () => void;
}) {
  const [title, setTitle] = useState(fuzzyTask.title);
  const [memo, setMemo] = useState(fuzzyTask.memo ?? "");
  const [status, setStatus] = useState<FuzzyTaskStatus>(fuzzyTask.status);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showPromote, setShowPromote] = useState(false);
  const [promoteDueDate, setPromoteDueDate] = useState("");
  const [promotePriority, setPromotePriority] = useState<Priority>("medium");
  const [promoteTags, setPromoteTags] = useState<string[]>([]);
  const [promoting, setPromoting] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/fuzzy-tasks/${fuzzyTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, memo: memo || null, status }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("このふわふわタスクを削除しますか？")) return;
    setDeleting(true);
    try {
      await fetch(`/api/fuzzy-tasks/${fuzzyTask.id}`, { method: "DELETE" });
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  async function handlePromote() {
    setPromoting(true);
    try {
      await fetch(`/api/fuzzy-tasks/${fuzzyTask.id}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          due_date: promoteDueDate || undefined,
          priority: promotePriority,
          tags: promoteTags,
        }),
      });
      onPromoted();
    } finally {
      setPromoting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg card-shadow max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-headline-md text-headline-md text-on-surface">ふわふわタスク詳細</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1">内容</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1">メモ</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={3}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStatus("open")}
              className={`px-4 py-2 rounded-full text-sm font-bold ${status === "open" ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}
            >
              対応中
            </button>
            <button
              onClick={() => setStatus("resolved")}
              className={`px-4 py-2 rounded-full text-sm font-bold ${status === "resolved" ? "bg-secondary text-on-secondary" : "bg-surface-container text-on-surface-variant"}`}
            >
              解消済み
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-outline-variant/20">
          <button onClick={handleDelete} disabled={deleting} className="text-error text-sm hover:underline disabled:opacity-50">
            {deleting ? "削除中..." : "削除する"}
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-outline-variant text-sm text-on-surface-variant">
              キャンセル
            </button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-bold disabled:opacity-50">
              {saving ? "保存中..." : "保存する"}
            </button>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-outline-variant/20">
          {!showPromote ? (
            <button onClick={() => setShowPromote(true)} className="text-primary text-sm font-bold hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px]">task_alt</span>
              確定してタスク化する
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <h4 className="font-label-sm text-label-sm text-on-surface-variant uppercase">タスクとして登録</h4>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-label-sm text-on-surface-variant mb-1">期限(任意)</label>
                  <input
                    type="date"
                    value={promoteDueDate}
                    onChange={(e) => setPromoteDueDate(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-label-sm text-on-surface-variant mb-1">優先度</label>
                  <select
                    value={promotePriority}
                    onChange={(e) => setPromotePriority(e.target.value as Priority)}
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="high">高</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                  </select>
                </div>
              </div>
              <TagPicker value={promoteTags} onChange={setPromoteTags} />
              <button
                onClick={handlePromote}
                disabled={promoting}
                className="bg-secondary text-on-secondary rounded-lg py-2 text-sm font-bold disabled:opacity-50"
              >
                {promoting ? "登録中..." : "タスクとして登録する"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
