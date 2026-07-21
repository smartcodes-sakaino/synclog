import Header from "@/components/Header";
import SettingsClient from "@/components/SettingsClient";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "連携処理に失敗しました。もう一度お試しください。",
  token_exchange_failed: "Googleとの認証に失敗しました。",
  userinfo_failed: "Googleアカウント情報の取得に失敗しました。",
  no_refresh_token: "Googleから継続利用に必要な権限を取得できませんでした。一度連携を解除し、再度同意画面で許可してください。",
  save_failed: "連携情報の保存に失敗しました。",
  config_error: "サーバー側の設定に問題があります。",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; detail?: string }>;
}) {
  const { error, detail } = await searchParams;

  return (
    <>
      <Header title="Settings" />
      {error && (
        <div className="mx-container-padding mt-container-padding text-error text-sm bg-error-container text-on-error-container rounded-lg p-3">
          <p>{ERROR_MESSAGES[error] ?? "連携中にエラーが発生しました。"}</p>
          {detail && <p className="mt-1 text-xs opacity-80 break-words">詳細: {detail}</p>}
        </div>
      )}
      <SettingsClient />
    </>
  );
}
