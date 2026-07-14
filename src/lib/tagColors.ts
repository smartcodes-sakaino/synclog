// ダッシュボードのタグフォルダに割り当てる色を巡回で決定する
// (プロトタイプのデザイントークンに準拠: primary/secondary/tertiary/peach/grayの5色)
export const TAG_COLOR_CYCLE = ["primary", "secondary", "tertiary", "peach", "gray"] as const;
export type TagColorKey = (typeof TAG_COLOR_CYCLE)[number];

export function nextTagColor(existingTagCount: number): TagColorKey {
  return TAG_COLOR_CYCLE[existingTagCount % TAG_COLOR_CYCLE.length];
}

const COLOR_CLASS_MAP: Record<TagColorKey, { bg: string; text: string; icon: string }> = {
  primary: { bg: "bg-primary-container", text: "text-on-primary-container", icon: "bg-primary-container" },
  secondary: { bg: "bg-secondary-container", text: "text-on-secondary-container", icon: "bg-secondary-container" },
  tertiary: { bg: "bg-tertiary-container", text: "text-on-tertiary-container", icon: "bg-tertiary-container" },
  peach: { bg: "bg-primary-fixed", text: "text-on-primary-fixed-variant", icon: "bg-primary-fixed" },
  gray: { bg: "bg-surface-container-high", text: "text-on-surface-variant", icon: "bg-surface-container-high" },
};

export function tagColorClasses(colorKey: string) {
  return COLOR_CLASS_MAP[colorKey as TagColorKey] ?? COLOR_CLASS_MAP.gray;
}
