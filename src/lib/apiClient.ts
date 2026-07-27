export class ApiError extends Error {}

// 全クライアントコンポーネント共通のfetchラッパー。
// エラー時はres.okを見ずに握りつぶす、というありがちな漏れを防ぐため、
// 失敗時は必ずApiErrorをthrowする(呼び出し側はcatchしてトースト表示する)
export async function apiFetch<T = void>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);

  if (res.status === 204) return undefined as T;

  const rawText = await res.text();
  let data: unknown = null;
  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      if (!res.ok) throw new ApiError("サーバーとの通信でエラーが発生しました");
      return undefined as T;
    }
  }

  if (!res.ok) {
    const message = (data as { error?: string } | null)?.error ?? "処理に失敗しました";
    throw new ApiError(message);
  }

  return data as T;
}
