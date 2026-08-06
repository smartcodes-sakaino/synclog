"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { apiFetch } from "@/lib/apiClient";
import type { UserLevel } from "@/types";

const FALLBACK_MESSAGES = ["今日もよろしくお願いします", "調子はいかがですか？", "一緒にがんばりましょう"];

interface Tier {
  name: string;
  crown: string | null;
  sparkle: boolean;
  glow: string | null;
}

function getTier(level: number): Tier {
  if (level >= 90) return { name: "レジェンド", crown: "👑", sparkle: true, glow: "0 0 30px rgba(255,120,190,0.85)" };
  if (level >= 70) return { name: "マスター", crown: "👑", sparkle: true, glow: "0 0 24px rgba(255,200,87,0.8)" };
  if (level >= 50) return { name: "エキスパート", crown: "🥈", sparkle: false, glow: "0 0 20px rgba(192,197,255,0.7)" };
  if (level >= 30) return { name: "ベテラン", crown: "🥉", sparkle: false, glow: null };
  if (level >= 10) return { name: "一人前", crown: null, sparkle: false, glow: null };
  return { name: "見習い", crown: null, sparkle: false, glow: null };
}

export default function AvatarPanel({ initialUserLevel }: { initialUserLevel: UserLevel }) {
  const [message, setMessage] = useState<string | null>(null);
  const [userLevel, setUserLevel] = useState<UserLevel>(initialUserLevel);
  const [assessing, setAssessing] = useState(false);
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

  async function handleAssessLevel() {
    setAssessing(true);
    try {
      const data = await apiFetch<{ userLevel: UserLevel }>("/api/mypage/level", { method: "POST" });
      setUserLevel(data.userLevel);
      showToast(`レベル${data.userLevel.level}と判定されました`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "判定に失敗しました");
    } finally {
      setAssessing(false);
    }
  }

  const tier = getTier(userLevel.level);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-10 py-12 px-8">
      <div className="flex flex-col items-center gap-2">
        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
          {tier.name}
        </span>
        <span className="font-headline-lg text-headline-lg text-primary">Lv. {userLevel.level}</span>
      </div>

      <div className="relative flex items-center justify-center">
        {tier.crown && (
          <span className="absolute -top-9 left-1/2 -translate-x-1/2 text-5xl z-10 select-none">{tier.crown}</span>
        )}
        {tier.sparkle && (
          <>
            <span className="avatar-sparkle absolute -top-2 -left-6 text-2xl select-none">✨</span>
            <span
              className="avatar-sparkle absolute top-6 -right-8 text-2xl select-none"
              style={{ animationDelay: "0.6s" }}
            >
              ✨
            </span>
            <span
              className="avatar-sparkle absolute bottom-2 -left-10 text-xl select-none"
              style={{ animationDelay: "1.1s" }}
            >
              ✨
            </span>
          </>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/avatar-bear.png"
          alt="相棒"
          className="avatar-idle w-72 md:w-[26rem] select-none"
          draggable={false}
          style={tier.glow ? { filter: `drop-shadow(${tier.glow})` } : undefined}
        />
      </div>

      <div className="bg-surface-container-lowest border-2 border-on-surface/80 rounded-2xl px-8 py-5 max-w-lg w-full text-center card-shadow min-h-[5rem] flex items-center justify-center">
        <p className="font-headline-md text-headline-md text-on-surface">{message ?? "…"}</p>
      </div>

      <button
        onClick={handleAssessLevel}
        disabled={assessing}
        className="text-primary text-sm font-bold hover:underline flex items-center gap-1 disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
        {assessing ? "判定中..." : "レベルを判定する"}
      </button>
    </div>
  );
}
