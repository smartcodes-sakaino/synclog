import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getTagsForUser } from "@/lib/tags";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const tags = await getTagsForUser(userId);
  return NextResponse.json({ tags });
}
