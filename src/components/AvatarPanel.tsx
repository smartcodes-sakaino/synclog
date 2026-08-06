"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useToast } from "@/components/ToastProvider";
import { apiFetch } from "@/lib/apiClient";
import type { UserLevel } from "@/types";

const FALLBACK_MESSAGES = ["今日もよろしくお願いします", "調子はいかがですか？", "一緒にがんばりましょう"];

interface Tier {
  max: number;
  name: string;
  image: string;
}

// 10Lv刻みで見た目そのものが変わる(絵を差し替える)。段階内の滑らかさはグローで補う
const TIERS: Tier[] = [
  { max: 10, name: "見習い", image: "/avatar-bear.png" },
  { max: 20, name: "新人", image: "/avatar-bear-lv20.png" },
  { max: 30, name: "一人前", image: "/avatar-bear-lv30.png" },
  { max: 40, name: "頼れる存在", image: "/avatar-bear-lv40.png" },
  { max: 50, name: "ベテラン", image: "/avatar-bear-lv50.png" },
  { max: 60, name: "エキスパート", image: "/avatar-bear-lv60.png" },
  { max: 70, name: "プロフェッショナル", image: "/avatar-bear-lv70.png" },
  { max: 80, name: "マスター", image: "/avatar-bear-lv80.png" },
  { max: 90, name: "グランドマスター", image: "/avatar-bear-lv90.png" },
  { max: 100, name: "レジェンド", image: "/avatar-bear-lv100.png" },
];

function getTier(level: number): Tier {
  return TIERS.find((t) => level <= t.max) ?? TIERS[TIERS.length - 1];
}

interface AuraStyles {
  glowStyle: CSSProperties;
  auraStyle: CSSProperties;
  pulseDuration: string;
}

// レベルが上がるほど、絵の切り替わり(10刻み)とは別に、背景オーラの色相(ミント→水色→紫→
// ピンク→ゴールド)・強さ・脈動の速さが連続的に変化していく。強弱だけでなく色そのものが
// 変わることで、同じ立ち絵の中でも成長が体感しやすいようにしている
function getAuraStyles(level: number): AuraStyles | null {
  if (level < 40) return null;
  const t = Math.min(1, (level - 40) / 60);
  const hue = Math.round(160 + t * 260) % 360;
  const blur = Math.round(16 + t * 22);
  const glowOpacity = (0.45 + t * 0.35).toFixed(2);
  const auraOpacity = (0.25 + t * 0.5).toFixed(2);
  const auraSize = Math.round(65 + t * 45);
  const pulseDuration = (3.2 - t * 1.9).toFixed(2);

  return {
    glowStyle: {
      filter: `drop-shadow(0 0 ${blur}px hsla(${hue}, 85%, 70%, ${glowOpacity}))`,
    },
    auraStyle: {
      width: `${auraSize}%`,
      height: `${auraSize}%`,
      background: `radial-gradient(circle, hsla(${hue}, 90%, 70%, ${auraOpacity}) 0%, transparent 72%)`,
      filter: "blur(6px)",
      animationDuration: `${pulseDuration}s`,
    },
    pulseDuration,
  };
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
  const aura = getAuraStyles(userLevel.level);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-10 py-12 px-8">
      <div className="flex flex-col items-center gap-2">
        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
          {tier.name}
        </span>
        <span className="font-headline-lg text-headline-lg text-primary">Lv. {userLevel.level}</span>
      </div>

      <div className="relative flex items-center justify-center">
        {aura && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="aura-pulse rounded-full" style={aura.auraStyle} />
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tier.image}
          alt="相棒"
          className="avatar-idle relative w-72 md:w-[26rem] select-none"
          draggable={false}
          style={aura?.glowStyle}
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
