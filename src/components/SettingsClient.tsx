"use client";

import { useEffect, useState } from "react";
import type { GoogleAccount } from "@/types";

export default function SettingsClient() {
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);

  async function load() {
    const res = await fetch("/api/settings/google-accounts");
    const data = await res.json();
    setAccounts(data.accounts ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function disconnect(id: string) {
    await fetch(`/api/settings/google-accounts/${id}`, { method: "DELETE" });
    load();
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
    </main>
  );
}
