import { NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { getPrimaryGoogleAccount } from "@/lib/googleAccounts";
import { createGmailDraft } from "@/lib/google/gmail";
import type { Workflow } from "@/types";

// ワークフローボタン実行。定型内容でGmail下書きを作成する(送信はしない)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const workflow = await queryOne<Workflow>("select * from workflows where id = $1 and user_id = $2", [
    id,
    userId,
  ]);
  if (!workflow) return NextResponse.json({ error: "not found" }, { status: 404 });

  const account = await getPrimaryGoogleAccount(userId);
  if (!account) {
    return NextResponse.json({ error: "Googleアカウントが連携されていません" }, { status: 400 });
  }

  try {
    const draftId = await createGmailDraft(account, workflow.to_emails, workflow.subject, workflow.body);
    return NextResponse.json({ draftId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "下書きの作成に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
