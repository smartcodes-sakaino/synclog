"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { apiFetch } from "@/lib/apiClient";
import type { GoogleAccount, SlackAccount } from "@/types";

export default function SettingsClient() {
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [slackAccounts, setSlackAccounts] = useState<SlackAccount[]>([]);
  const { showToast } = useToast();

  async function load() {
    try {
      const data = await apiFetch<{ accounts: GoogleAccount[] }>("/api/settings/google-accounts");
      setAccounts(data.accounts ?? []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "取得に失敗しました");
    }
  }

  async function loadSlack() {
    try {
      const data = await apiFetch<{ accounts: SlackAccount[] }>("/api/settings/slack-accounts");
      setSlackAccounts(data.accounts ?? []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "取得に失敗しました");
    }
  }

  useEffect(() => {
    load();
    loadSlack();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function disconnect(id: string) {
    try {
      await apiFetch(`/api/settings/google-accounts/${id}`, { method: "DELETE" });
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "連携解除に失敗しました");
    }
  }

  async function disconnectSlack(id: string) {
    try {
      await apiFetch(`/api/settings/slack-accounts/${id}`, { method: "DELETE" });
      loadSlack();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "連携解除に失敗しました");
    }
  }

  return (
    <main className="flex-grow p-container-padding flex flex-col gap-card-gap max-w-2xl">
      <div className="bg-white rounded-xl p-6 card-shadow border border-outline-variant/20">
        <h3 className="font-headline-md text-headline-md text-on-surface mb-2">連携中のGoogleアカウント</h3>
        <p className="text-on-surface-variant text-sm mb-6">
          カレンダー統合・日報のGmail下書き作成・議事録の読み込みに使用します。
        </p>
        <div className="flex flex-col gap-3 mb-6">
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low">
              <div>
                <p className="font-bold text-on-surface">{a.account_label ?? a.google_email}</p>
                <p className="text-sm text-on-surface-variant">{a.google_email}</p>
              </div>
              <button onClick={() => disconnect(a.id)} className="text-error text-sm hover:underline">連携解除</button>
            </div>
          ))}
          {accounts.length === 0 && <p className="text-on-surface-variant text-sm">まだ連携されていません</p>}
        </div>
        <a
          href="/api/settings/google-accounts/connect"
          className="inline-flex items-center gap-2 bg-primary text-on-primary font-bold py-3 px-6 rounded-full shadow-md hover:shadow-lg transition-all"
        >
          <span className="material-symbols-outlined">add_circle</span>アカウントを追加
        </a>
      </div>

      <div className="bg-white rounded-xl p-6 card-shadow border border-outline-variant/20">
        <h3 className="font-headline-md text-headline-md text-on-surface mb-2">連携中のSlackワークスペース</h3>
        <p className="text-on-surface-variant text-sm mb-6">
          おはようタスク・ワークフロー(チャンネル作成など)に使用します。ワークスペースごとに個別に連携します。
        </p>
        <div className="flex flex-col gap-3 mb-6">
          {slackAccounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low">
              <div>
                <p className="font-bold text-on-surface">{a.workspace_name}</p>
                <p className="text-sm text-on-surface-variant">{a.workspace_id}</p>
              </div>
              <button onClick={() => disconnectSlack(a.id)} className="text-error text-sm hover:underline">
                連携解除
              </button>
            </div>
          ))}
          {slackAccounts.length === 0 && <p className="text-on-surface-variant text-sm">まだ連携されていません</p>}
        </div>
        <a
          href="/api/settings/slack/connect"
          className="inline-flex items-center gap-2 bg-primary text-on-primary font-bold py-3 px-6 rounded-full shadow-md hover:shadow-lg transition-all"
        >
          <span className="material-symbols-outlined">add_circle</span>Slackワークスペースを追加
        </a>
      </div>
    </main>
  );
}
