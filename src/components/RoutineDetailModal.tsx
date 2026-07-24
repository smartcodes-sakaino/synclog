"use client";

import { useState } from "react";
import TagPicker from "@/components/TagPicker";
import type { Routine, RoutineStatus } from "@/types";

export default function RoutineDetailModal({
  routine,
  onClose,
  onSaved,
  onDeleted,
}: {
  routine: Routine;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [title, setTitle] = useState(routine.title);
  const [memo, setMemo] = useState(routine.memo ?? "");
  const [status, setStatus] = useState<RoutineStatus>(routine.status);
  const [tags, setTags] = useState(routine.tags.map((t) => t.name));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/routines/${routine.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, memo: memo || null, status, tags }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("この定例業務を削除しますか？")) return;
    setDeleting(true);
    try {
      await fetch(`/api/routines/${routine.id}`, { method: "DELETE" });
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg card-shadow max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-headline-md text-headline-md text-on-surface">定例業務の詳細</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1">タイトル</label>
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
              rows={4}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setStatus("active")}
              className={`px-4 py-2 rounded-full text-sm font-bold ${status === "active" ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}
            >
              対応中
            </button>
            <button
              onClick={() => setStatus("archived")}
              className={`px-4 py-2 rounded-full text-sm font-bold ${status === "archived" ? "bg-secondary text-on-secondary" : "bg-surface-container text-on-surface-variant"}`}
            >
              アーカイブ
            </button>
          </div>
          <div>
            <label className="block text-label-sm text-on-surface-variant mb-2">タグ</label>
            <TagPicker value={tags} onChange={setTags} />
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
      </div>
    </div>
  );
}
