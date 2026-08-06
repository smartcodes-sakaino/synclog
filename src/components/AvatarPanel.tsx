"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { apiFetch } from "@/lib/apiClient";

const FALLBACK_MESSAGES = ["今日もよろしくね", "調子はどう？", "一緒にがんばろう"];

export default function AvatarPanel() {
  const [message, setMessage] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    apiFetch<{ message: string }>("/api/mypage/companion-message", { method: "POST" })
      .then((data) => {
        setMessage(data.message || FALLBACK_MESSAGES[Math.floor(Math.random() * FALLBACK_MESSAGES.length)]);
      })
      .catch((err) => {
        showToast(err instanceof Error ? err.message : "セリフの取得に失敗しました");
        setMessage(FALLBACK_MESSAGES[Math.floor(Math.random() * FALLBACK_MESSAGES.length)]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 py-10 px-6">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/avatar-bear.png" alt="相棒" className="avatar-idle w-56 md:w-72 drop-shadow-xl select-none" draggable={false} />
      <div className="bg-surface-container-lowest border-2 border-on-surface/80 rounded-2xl px-6 py-4 max-w-sm w-full text-center card-shadow min-h-[4.5rem] flex items-center justify-center">
        <p className="font-body-lg text-body-lg text-on-surface">{message ?? "…"}</p>
      </div>
    </div>
  );
}
