import { getSupabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/session";

export const ALLOWED_LOGIN_EMAIL = process.env.ALLOWED_LOGIN_EMAIL ?? "";

// 現在のセッションに対応するユーザーIDを返す。未ログインの場合はnull
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  return session.userId ?? null;
}

// ログイン許可されたメールアドレスに対応するユーザーレコードを取得(なければ作成)する
export async function findOrCreateUserByEmail(email: string) {
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("users")
    .insert({ email, display_name: email.split("@")[0] })
    .select("*")
    .single();

  if (error) throw error;
  return created;
}
