"use client";

import { useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { apiFetch } from "@/lib/apiClient";
import type { Workflow } from "@/types";

type Props =
  | { mode: "create"; onClose: () => void; onSaved: () => void }
  | { mode: "edit"; workflow: Workflow; onClose: () => void; onSaved: () => void; onDeleted: () => void };

export default function WorkflowDetailModal(props: Props) {
  const isEdit = props.mode === "edit";
  const [title, setTitle] = useState(isEdit ? props.workflow.title : "");
  const [toEmails, setToEmails] = useState(isEdit ? props.workflow.to_emails : "");
  const [subject, setSubject] = useState(isEdit ? props.workflow.subject : "");
  const [body, setBody] = useState(isEdit ? props.workflow.body : "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  async function handleSave() {
    if (!title.trim() || !toEmails.trim() || !subject.trim() || !body.trim()) return;
    setSaving(true);
    try {
      const payload = { title, to_emails: toEmails, subject, body };
      if (isEdit) {
        await apiFetch(`/api/workflows/${props.workflow.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      props.onSaved();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!isEdit) return;
    if (!confirm("このワークフローを削除しますか？")) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/workflows/${props.workflow.id}`, { method: "DELETE" });
      props.onDeleted();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "削除に失敗しました");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={props.onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl card-shadow max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-headline-md text-headline-md text-on-surface">
            {isEdit ? "ワークフローの編集" : "ワークフローを追加"}
          </h3>
          <button onClick={props.onClose} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1">ボタン名</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 有給申請"
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1">宛先</label>
            <input
              value={toEmails}
              onChange={(e) => setToEmails(e.target.value)}
              placeholder="a@example.com, b@example.com"
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1">件名</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1">本文</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 font-mono text-sm resize-none"
            />
          </div>
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-outline-variant/20">
          {isEdit ? (
            <button onClick={handleDelete} disabled={deleting} className="text-error text-sm hover:underline disabled:opacity-50">
              {deleting ? "削除中..." : "削除する"}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={props.onClose} className="px-4 py-2 rounded-lg border border-outline-variant text-sm text-on-surface-variant">
              キャンセル
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !title.trim() || !toEmails.trim() || !subject.trim() || !body.trim()}
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
