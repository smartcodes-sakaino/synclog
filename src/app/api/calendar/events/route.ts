import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { listGoogleAccountsForUser } from "@/lib/googleAccounts";
import { listMergedEvents } from "@/lib/google/calendar";

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!start || !end) {
    return NextResponse.json({ error: "start, end は必須です" }, { status: 400 });
  }

  const accounts = await listGoogleAccountsForUser(userId);
  if (accounts.length === 0) {
    return NextResponse.json({ events: [], accounts: [] });
  }

  const events = await listMergedEvents(accounts, start, end);
  return NextResponse.json({
    events,
    accounts: accounts.map((a) => ({ email: a.google_email, colorKey: a.color_key })),
  });
}
