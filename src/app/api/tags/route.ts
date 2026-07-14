import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import type { Tag } from "@/types";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const tags = await query<Tag>("select * from tags where user_id = $1 order by created_at asc", [userId]);
  return NextResponse.json({ tags });
}
