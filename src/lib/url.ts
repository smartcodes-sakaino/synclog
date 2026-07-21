// Replitなどプロキシの裏側で動く環境では、Next.jsから見た request.url が
// 内部ポート(例: http://localhost:25893/...)になってしまい、
// new URL(path, request.url) でリダイレクト先を組み立てると公開URLではなく
// 到達不能な内部URLになってしまう。必ずAPP_BASE_URLを基準にする
export function absoluteUrl(path: string): URL {
  const base = process.env.APP_BASE_URL;
  if (!base) {
    throw new Error("APP_BASE_URL が設定されていません(Replit Deployments の Secrets を確認してください)");
  }
  return new URL(path, base);
}
