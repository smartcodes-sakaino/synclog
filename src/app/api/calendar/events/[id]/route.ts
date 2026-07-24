import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth";
import { listGoogleAccountsForUser } from "@/lib/googleAccounts";
import { deleteCalendarEvent, updateCalendarEvent } from "@/lib/google/calendar";

// idは "{google_accountsのid}:{Googleの予定ID}" の複合キー
function parseCompositeId(id: string): { accountId: string; googleEventId: string } {
  const separatorIndex = id.indexOf(":");
  if (separatorIndex === -1) throw new Error("不正な予定IDです");
  return {
    accountId: id.slice(0, separatorIndex),
    googleEventId: id.slice(separatorIndex + 1),
  };
}

const updateEventSchema = z.object({
  title: z.string().min(1),
  date: z.string(),
  allDay: z.boolean(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const { accountId, googleEventId } = parseCompositeId(decodeURIComponent(id));

  const accounts = await listGoogleAccountsForUser(userId);
  const account = accounts.find((a) => a.id === accountId);
  if (!account) return NextResponse.json({ error: "アカウントが見つかりません" }, { status: 404 });

  const body = updateEventSchema.parse(await request.json());
  const start = body.allDay ? body.date : `${body.date}T${body.startTime ?? "09:00"}:00+09:00`;
  const end = body.allDay ? body.date : `${body.date}T${body.endTime ?? "10:00"}:00+09:00`;

  try {
    await updateCalendarEvent(account, googleEventId, { title: body.title, allDay: body.allDay, start, end });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: "予定の更新に失敗しました", detail: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const { accountId, googleEventId } = parseCompositeId(decodeURIComponent(id));

  const accounts = await listGoogleAccountsForUser(userId);
  const account = accounts.find((a) => a.id === accountId);
  if (!account) return NextResponse.json({ error: "アカウントが見つかりません" }, { status: 404 });

  try {
    await deleteCalendarEvent(account, googleEventId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: "予定の削除に失敗しました", detail: message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
