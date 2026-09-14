import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { queryOne } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";
import { getPrimaryGoogleAccount } from "@/lib/googleAccounts";
import { createGmailDraft } from "@/lib/google/gmail";
import { getSlackAccountForWorkspace } from "@/lib/slackAccounts";
import { createSlackChannel, inviteToSlackChannel } from "@/lib/slack/conversations";
import { buildDelayCertificateUrl, buildTrainDelayFormUrl } from "@/lib/trainDelayWorkflow";
import type { SlackCreateChannelConfig, Workflow } from "@/types";

const runSchema = z.object({ channelName: z.string().optional() });

// ワークフローボタン実行。kindに応じてGmail下書き作成 or Slackチャンネル作成+招待を行う
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const workflow = await queryOne<Workflow>("select * from workflows where id = $1 and user_id = $2", [
    id,
    userId,
  ]);
  if (!workflow) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = runSchema.parse(await request.json().catch(() => ({})));

  try {
    if (workflow.kind === "train_delay") {
      return NextResponse.json({
        delayCertificateUrl: buildDelayCertificateUrl(),
        formUrl: buildTrainDelayFormUrl(),
      });
    }

    if (workflow.kind === "slack_create_channel") {
      const config = workflow.config as Partial<SlackCreateChannelConfig>;
      const channelName = body.channelName?.trim() || config.channelNameTemplate;
      if (!channelName) {
        return NextResponse.json({ error: "チャンネル名を入力してください" }, { status: 400 });
      }

      const account = await getSlackAccountForWorkspace(userId, config.workspaceId);
      if (!account) {
        return NextResponse.json({ error: "Slackワークスペースが連携されていません" }, { status: 400 });
      }

      const channel = await createSlackChannel(account, channelName, config.visibility !== "public");
      // チャンネル作成者(=このトークンの持ち主)は自動的にメンバーになっており、
      // 招待リストに含まれているとSlack APIがcant_invite_selfを返すため除外する
      const inviteUserIds = (config.inviteUserIds ?? []).filter((uid) => uid !== account.slack_user_id);
      await inviteToSlackChannel(account, channel.id, inviteUserIds);
      return NextResponse.json({ channel });
    }

    const account = await getPrimaryGoogleAccount(userId);
    if (!account) {
      return NextResponse.json({ error: "Googleアカウントが連携されていません" }, { status: 400 });
    }
    const draftId = await createGmailDraft(
      account,
      workflow.to_emails ?? "",
      workflow.subject ?? "",
      workflow.body ?? ""
    );
    return NextResponse.json({ draftId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "実行に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
