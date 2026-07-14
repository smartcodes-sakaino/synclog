// Replitの Scheduled Deployment から平日17:30(JST)に実行するスクリプト。
// (VercelのCronの代わり。本体は/api/cron/daily-reportのHTTPエンドポイントを叩くだけ)

const baseUrl = process.env.APP_BASE_URL;
const secret = process.env.CRON_SECRET;

if (!baseUrl || !secret) {
  console.error("APP_BASE_URL / CRON_SECRET が設定されていません");
  process.exit(1);
}

const res = await fetch(`${baseUrl}/api/cron/daily-report`, {
  headers: { Authorization: `Bearer ${secret}` },
});

const body = await res.text();
console.log(`status=${res.status} body=${body}`);

if (!res.ok) {
  process.exit(1);
}
