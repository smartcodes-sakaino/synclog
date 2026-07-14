import { queryOne } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { User } from "@/types";

export const ALLOWED_LOGIN_EMAIL = process.env.ALLOWED_LOGIN_EMAIL ?? "";

// 現在のセッションに対応するユーザーIDを返す。未ログインの場合はnull
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  return session.userId ?? null;
}

// ログイン許可されたメールアドレスに対応するユーザーレコードを取得(なければ作成)する
export async function findOrCreateUserByEmail(email: string): Promise<User> {
  const existing = await queryOne<User>("select * from users where email = $1", [email]);
  if (existing) return existing;

  const created = await queryOne<User>(
    "insert into users (email, display_name) values ($1, $2) returning *",
    [email, email.split("@")[0]]
  );
  if (!created) throw new Error("ユーザーの作成に失敗しました");
  return created;
}
