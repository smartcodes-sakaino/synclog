"use client";

import { useState } from "react";
import WorkflowDetailModal from "@/components/WorkflowDetailModal";
import { useToast } from "@/components/ToastProvider";
import { apiFetch } from "@/lib/apiClient";
import type { Workflow } from "@/types";

const CARD_STYLES = [
  "bg-primary-fixed-dim/30 border-primary-fixed text-on-primary-fixed-variant",
  "bg-tertiary-fixed/40 border-tertiary-fixed text-on-tertiary-fixed-variant",
  "bg-secondary-fixed-dim/30 border-secondary-fixed text-on-secondary-fixed-variant",
];

export default function WorkflowsClient({ initialWorkflows }: { initialWorkflows: Workflow[] }) {
  const [workflows, setWorkflows] = useState<Workflow[]>(initialWorkflows);
  const [editing, setEditing] = useState<Workflow | null>(null);
  const [creating, setCreating] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const { showToast } = useToast();

  async function load() {
    try {
      const data = await apiFetch<{ workflows: Workflow[] }>("/api/workflows");
      setWorkflows(data.workflows ?? []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "取得に失敗しました");
    }
  }

  async function run(workflow: Workflow) {
    setRunningId(workflow.id);
    try {
      await apiFetch(`/api/workflows/${workflow.id}/run`, { method: "POST" });
      showToast(`「${workflow.title}」の下書きを作成しました`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "下書きの作成に失敗しました");
    } finally {
      setRunningId(null);
    }
  }

  return (
    <div className="p-container-padding">
      <div className="glass-panel rounded-[24px] p-6 mb-6">
        <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-primary-container">bolt</span>
          ワークフロー
        </h3>
        <p className="font-body-md text-body-md text-on-surface-variant mb-4">
          定型業務をボタン一つでGmail下書き作成まで実行します
        </p>
        <button
          onClick={() => setCreating(true)}
          className="bg-primary text-on-primary rounded-lg px-4 py-2 text-sm font-bold flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>ワークフローを追加
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {workflows.length === 0 && (
          <p className="text-label-sm text-on-surface-variant col-span-full">まだワークフローがありません</p>
        )}
        {workflows.map((workflow, i) => (
          <div
            key={workflow.id}
            className={`rounded-xl p-5 border shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 ${CARD_STYLES[i % CARD_STYLES.length]}`}
          >
            <div className="flex items-center justify-between">
              <h4 className="font-body-lg text-body-lg">{workflow.title}</h4>
              <button onClick={() => setEditing(workflow)} className="text-on-surface-variant/70 hover:text-on-surface">
                <span className="material-symbols-outlined text-[18px]">edit</span>
              </button>
            </div>
            <p className="text-xs text-on-surface-variant/70 truncate">宛先: {workflow.to_emails}</p>
            <button
              onClick={() => run(workflow)}
              disabled={runningId === workflow.id}
              className="bg-surface/70 hover:bg-surface rounded-lg py-2 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">mail</span>
              {runningId === workflow.id ? "作成中..." : "下書きを作成"}
            </button>
          </div>
        ))}
      </div>

      {creating && (
        <WorkflowDetailModal
          mode="create"
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            load();
          }}
        />
      )}
      {editing && (
        <WorkflowDetailModal
          mode="edit"
          workflow={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
          onDeleted={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
