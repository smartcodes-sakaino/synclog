"use client";

import { useState } from "react";
import TagPicker from "@/components/TagPicker";
import type { Priority, Task, TaskStatus } from "@/types";

export default function TaskDetailModal({
  task,
  onClose,
  onSaved,
  onDeleted,
}: {
  task: Task;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [dueDate, setDueDate] = useState(task.due_date ?? "");
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [tags, setTags] = useState(task.tags.map((t) => t.name));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          due_date: dueDate || null,
          priority,
          status,
          tags,
        }),
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("このタスクを削除しますか？")) return;
    setDeleting(true);
    try {
      await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-lg card-shadow max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-headline-md text-headline-md text-on-surface">タスク詳細</h3>
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
            <label className="block text-label-sm text-on-surface-variant mb-1">詳細メモ</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-label-sm text-on-surface-variant mb-1">期限</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-label-sm text-on-surface-variant mb-1">優先度</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 text-sm"
              >
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>
            <div>
              <label className="block text-label-sm text-on-surface-variant mb-1">ステータス</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 text-sm"
              >
                <option value="todo">未対応</option>
                <option value="in_progress">進行中</option>
                <option value="done">完了</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1">タグ</label>
            <TagPicker value={tags} onChange={setTags} />
          </div>
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-outline-variant/20">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-error text-sm hover:underline disabled:opacity-50"
          >
            {deleting ? "削除中..." : "削除する"}
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-outline-variant text-sm text-on-surface-variant"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-bold disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存する"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
