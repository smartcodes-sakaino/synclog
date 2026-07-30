"use client";

import { useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { apiFetch } from "@/lib/apiClient";
import type { SlackCreateChannelConfig, Workflow } from "@/types";

export default function WorkflowRunModal({
  workflow,
  onClose,
  onRan,
}: {
  workflow: Workflow;
  onClose: () => void;
  onRan: () => void;
}) {
  const config = workflow.config as Partial<SlackCreateChannelConfig>;
  const [channelName, setChannelName] = useState(config.channelNameTemplate ?? "");
  const [running, setRunning] = useState(false);
  const { showToast } = useToast();

  async function handleRun() {
    if (!channelName.trim()) return;
    setRunning(true);
    try {
      await apiFetch(`/api/workflows/${workflow.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelName }),
      });
      showToast(`「${channelName}」を作成しました`, "success");
      onRan();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "実行に失敗しました");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md card-shadow" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-headline-md text-headline-md text-on-surface">{workflow.title}</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:text-primary">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <label className="block text-label-sm text-on-surface-variant mb-1">チャンネル名</label>
        <input
          value={channelName}
          onChange={(e) => setChannelName(e.target.value)}
          className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 font-mono text-sm mb-1"
          autoFocus
        />
        <p className="text-xs text-on-surface-variant mb-4">実行前に内容を確認・編集してください</p>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-outline-variant text-sm text-on-surface-variant">
            キャンセル
          </button>
          <button
            onClick={handleRun}
            disabled={running || !channelName.trim()}
            className="px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-bold disabled:opacity-50"
          >
            {running ? "作成中..." : "作成する"}
          </button>
        </div>
      </div>
    </div>
  );
}
