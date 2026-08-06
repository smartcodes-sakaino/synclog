export function todayInJST(): string {
  const formatter = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" });
  return formatter.format(new Date()); // "YYYY-MM-DD"形式
}

export function currentHourInJST(): number {
  const formatter = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tokyo", hour: "numeric", hour12: false });
  return Number(formatter.format(new Date()));
}
