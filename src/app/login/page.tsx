const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "ログイン処理に失敗しました。もう一度お試しください。",
  not_allowed: "このアプリはご本人専用です。許可されたGoogleアカウントでログインしてください。",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="glass-panel rounded-2xl p-10 max-w-sm w-full text-center flex flex-col items-center gap-6">
        <div className="w-14 h-14 rounded-xl bg-primary-container flex items-center justify-center text-on-primary-container">
          <span className="material-symbols-outlined text-3xl">task_alt</span>
        </div>
        <div>
          <h1 className="font-headline-md text-headline-md font-extrabold text-primary">SyncLog</h1>
          <p className="text-on-surface-variant mt-1">個人用タスク管理ツール</p>
        </div>
        {error && (
          <p className="text-error text-sm bg-error-container text-on-error-container rounded-lg p-3 w-full">
            {ERROR_MESSAGES[error] ?? "ログインできませんでした。"}
          </p>
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
