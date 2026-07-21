const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "ログイン処理に失敗しました。もう一度お試しください。",
  not_allowed: "このアプリはご本人専用です。許可されたGoogleアカウントでログインしてください。",
  token_exchange_failed: "Googleとの認証に失敗しました。",
  config_error: "サーバー側の設定に問題があります。",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; detail?: string }>;
}) {
  const { error, detail } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="glass-panel rounded-2xl p-10 max-w-sm w-full text-center flex flex-col items-center gap-6">
        <img src="/icon.png" alt="SyncLog" className="w-14 h-14 rounded-xl object-cover" />
        <div>
          <h1 className="font-headline-md text-headline-md font-extrabold text-primary">SyncLog</h1>
          <p className="text-on-surface-variant mt-1">個人用タスク管理ツール</p>
        </div>
        {error && (
          <div className="text-error text-sm bg-error-container text-on-error-container rounded-lg p-3 w-full text-left">
            <p>{ERROR_MESSAGES[error] ?? "ログインできませんでした。"}</p>
            {detail && <p className="mt-1 text-xs opacity-80 break-words">詳細: {detail}</p>}
          </div>
        )}
        <a
          href="/api/auth/login"
          className="w-full bg-primary text-on-primary font-bold py-3 px-6 rounded-full shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">login</span>
          Googleでログイン
        </a>
      </div>
    </div>
  );
}
