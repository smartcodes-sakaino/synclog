import { createClient } from "@supabase/supabase-js";

// Service Roleキーを使うサーバー専用クライアント。
// クライアント(ブラウザ)からは絶対に呼び出さないこと。
export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が設定されていません");
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
