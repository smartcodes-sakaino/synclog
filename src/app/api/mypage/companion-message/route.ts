import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { buildCompanionMessage } from "@/lib/companionService";

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const message = await buildCompanionMessage(userId);
    return NextResponse.json({ message });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("companion-message failed:", err);
    return NextResponse.json({ error: `セリフの生成に失敗しました(${detail})` }, { status: 500 });
  }
}
