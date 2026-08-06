import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { isCurrentlyBusy } from "@/lib/companionService";

// マイページのセリフ更新前に、今が予定中かどうかを軽く確認するためのエンドポイント
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const busy = await isCurrentlyBusy(userId);
  return NextResponse.json({ busy });
}
