import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const accounts = await query(
    `select id, google_email, account_label, color_key, token_expiry, scopes, created_at
     from google_accounts where user_id = $1 order by created_at asc`,
    [userId]
  );
  return NextResponse.json({ accounts });
}
