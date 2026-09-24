// サーバーのシステムタイムゾーン(Vercelなど本番実行環境はUTC)に依存せず、
// 日本時間基準の「今日」を扱うための共通ヘルパー。
// Date経由でformatすると実行環境のタイムゾーンに引っ張られて日付がずれるため、
// 各ワークフローで同じ変換ロジックを重複させないようにここに集約する。
export function todayJST(): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
}

export function currentYearMonthJST(): { year: number; month: number } {
  const [year, month] = todayJST().split("-").map(Number);
  return { year, month };
}
