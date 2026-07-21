import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth";
import { listGoogleAccountsForUser } from "@/lib/googleAccounts";
import { createCalendarEvent, listMergedEvents } from "@/lib/google/calendar";

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
    accounts: accounts.map((a) => ({ id: a.id, email: a.google_email, colorKey: a.color_key })),
  });
}

const createEventSchema = z.object({
  title: z.string().min(1),
  date: z.string(),
  allDay: z.boolean(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  accountIds: z.array(z.string()).min(1),
});

// SyncLog上で作成した予定を、選択した1つまたは複数のGoogleアカウントのカレンダーへ反映する
export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = createEventSchema.parse(await request.json());
  const allAccounts = await listGoogleAccountsForUser(userId);
  const targetAccounts = allAccounts.filter((a) => body.accountIds.includes(a.id));

  if (targetAccounts.length === 0) {
    return NextResponse.json({ error: "反映先のアカウントが見つかりません" }, { status: 400 });
  }

  const start = body.allDay ? body.date : `${body.date}T${body.startTime ?? "09:00"}:00+09:00`;
  const end = body.allDay ? body.date : `${body.date}T${body.endTime ?? "10:00"}:00+09:00`;

  const results = await Promise.allSettled(
    targetAccounts.map((account) =>
      createCalendarEvent(account, { title: body.title, allDay: body.allDay, start, end })
    )
  );

  const failed = results
    .map((r, i) =>
      r.status === "rejected"
        ? { email: targetAccounts[i].google_email, reason: r.reason instanceof Error ? r.reason.message : String(r.reason) }
        : null
    )
    .filter((f): f is { email: string; reason: string } => f !== null);

  if (failed.length > 0) {
    console.error("カレンダー予定の作成に失敗したアカウントがあります:", failed);
  }

  if (failed.length === targetAccounts.length) {
    return NextResponse.json(
      { error: "予定の作成にすべて失敗しました", detail: failed.map((f) => `${f.email}: ${f.reason}`).join(" / ") },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, failed: failed.map((f) => f.email) }, { status: 201 });
}
