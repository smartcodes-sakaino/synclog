import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { buildCompanionMessage } from "@/lib/companionService";

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const message = await buildCompanionMessage(userId);
  return NextResponse.json({ message });
}
