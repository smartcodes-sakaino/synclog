"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { apiFetch } from "@/lib/apiClient";
import type { SlackAccount, SlackCreateChannelConfig, Workflow, WorkflowKind } from "@/types";

type Props =
  | { mode: "create"; onClose: () => void; onSaved: () => void }
  | { mode: "edit"; workflow: Workflow; onClose: () => void; onSaved: () => void; onDeleted: () => void };

export default function WorkflowDetailModal(props: Props) {
  const isEdit = props.mode === "edit";
  const initial = isEdit ? props.workflow : null;
  const initialConfig = (initial?.config ?? {}) as Partial<SlackCreateChannelConfig>;

  const [kind, setKind] = useState<WorkflowKind>(initial?.kind ?? "gmail_draft");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [toEmails, setToEmails] = useState(initial?.to_emails ?? "");
  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [body, setBody] = useState(initial?.body ?? "");

  const [slackAccounts, setSlackAccounts] = useState<SlackAccount[]>([]);
  const [workspaceId, setWorkspaceId] = useState(initialConfig.workspaceId ?? "");
  const [channelNameTemplate, setChannelNameTemplate] = useState(initialConfig.channelNameTemplate ?? "");
  const [visibility, setVisibility] = useState<"private" | "public">(initialConfig.visibility ?? "private");
  const [inviteUserIds, setInviteUserIds] = useState((initialConfig.inviteUserIds ?? []).join(", "));

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (kind !== "slack_create_channel") return;
    apiFetch<{ accounts: SlackAccount[] }>("/api/settings/slack-accounts")
      .then((data) => {
        setSlackAccounts(data.accounts ?? []);
        setWorkspaceId((prev) => prev || data.accounts?.[0]?.workspace_id || "");
      })
      .catch((err) => showToast(err instanceof Error ? err.message : "Slack連携の取得に失敗しました"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const isValid =
    title.trim() !== "" &&
    (kind === "gmail_draft"
      ? toEmails.trim() !== "" && subject.trim() !== "" && body.trim() !== ""
      : kind === "slack_create_channel"
        ? workspaceId !== "" && channelNameTemplate.trim() !== ""
        : true);

  async function handleSave() {
    if (!isValid) return;
    setSaving(true);
    try {
      const payload =
        kind === "gmail_draft"
          ? { kind, title, to_emails: toEmails, subject, body, config: {} }
          : kind === "slack_create_channel"
            ? {
                kind,
                title,
                to_emails: null,
                subject: null,
                body: null,
                config: {
                  workspaceId,
                  channelNameTemplate,
                  visibility,
                  inviteUserIds: inviteUserIds
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                },
              }
            : { kind, title, to_emails: null, subject: null, body: null, config: {} };
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
            <label className="block text-label-sm text-on-surface-variant mb-1">種類</label>
            <div className="flex gap-2">
              <button
                onClick={() => setKind("gmail_draft")}
                className={`px-4 py-2 rounded-full text-sm font-bold ${kind === "gmail_draft" ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}
              >
                Gmail下書き
              </button>
              <button
                onClick={() => setKind("slack_create_channel")}
                className={`px-4 py-2 rounded-full text-sm font-bold ${kind === "slack_create_channel" ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}
              >
                Slackチャンネル作成
              </button>
              <button
                onClick={() => setKind("train_delay")}
                className={`px-4 py-2 rounded-full text-sm font-bold ${kind === "train_delay" ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}
              >
                電車遅延申請
              </button>
            </div>
          </div>

          <div>
            <label className="block text-label-sm text-on-surface-variant mb-1">ボタン名</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 有給申請"
              className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2"
            />
          </div>

          {kind === "train_delay" ? (
            <p className="text-xs text-on-surface-variant">
              実行すると、遅延証明書URLを含めて内容を事前入力済みのタイムカード更新依頼フォームが新しいタブで開きます(値は固定で設定変更はできません)
            </p>
          ) : kind === "gmail_draft" ? (
            <>
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
            </>
          ) : (
            <>
              <div>
                <label className="block text-label-sm text-on-surface-variant mb-1">対象ワークスペース</label>
                <select
                  value={workspaceId}
                  onChange={(e) => setWorkspaceId(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">選択してください</option>
                  {slackAccounts.map((a) => (
                    <option key={a.id} value={a.workspace_id}>
                      {a.workspace_name}
                    </option>
                  ))}
                </select>
                {slackAccounts.length === 0 && (
                  <p className="text-xs text-on-surface-variant mt-1">
                    連携済みのSlackワークスペースがありません。Settingsから連携してください。
                  </p>
                )}
              </div>
              <div>
                <label className="block text-label-sm text-on-surface-variant mb-1">
                  チャンネル名(実行時に編集できます)
                </label>
                <input
                  value={channelNameTemplate}
                  onChange={(e) => setChannelNameTemplate(e.target.value)}
                  placeholder="例: nc研修yymm-name"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 font-mono text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setVisibility("private")}
                  className={`px-4 py-2 rounded-full text-sm font-bold ${visibility === "private" ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}
                >
                  非公開チャンネル
                </button>
                <button
                  onClick={() => setVisibility("public")}
                  className={`px-4 py-2 rounded-full text-sm font-bold ${visibility === "public" ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant"}`}
                >
                  公開チャンネル
                </button>
              </div>
              <div>
                <label className="block text-label-sm text-on-surface-variant mb-1">招待するユーザーID</label>
                <input
                  value={inviteUserIds}
                  onChange={(e) => setInviteUserIds(e.target.value)}
                  placeholder="U07EU1B3G74, U0896L8FNTE"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-lg px-3 py-2 font-mono text-sm"
                />
                <p className="text-xs text-on-surface-variant mt-1">
                  カンマ区切りでSlackのメンバーIDを入力(SlackのプロフィールからCopy member IDで取得できます)
                </p>
              </div>
            </>
          )}
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
              disabled={saving || !isValid}
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
