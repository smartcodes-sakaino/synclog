import { decryptToken } from "@/lib/crypto";
import type { SlackAccountWithToken } from "@/lib/slackAccounts";

interface SlackApiResponse {
  ok: boolean;
  error?: string;
  channel?: { id: string; name: string };
}

async function callSlackApi(
  token: string,
  method: string,
  body: Record<string, unknown>
): Promise<SlackApiResponse> {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return (await res.json()) as SlackApiResponse;
}

export async function createSlackChannel(
  account: SlackAccountWithToken,
  name: string,
  isPrivate: boolean
): Promise<{ id: string; name: string }> {
  const token = decryptToken(account.access_token_encrypted);
  const data = await callSlackApi(token, "conversations.create", { name, is_private: isPrivate });
  if (!data.ok || !data.channel) {
    throw new Error(data.error ?? "Slackチャンネルの作成に失敗しました");
  }
  return { id: data.channel.id, name: data.channel.name };
}

export async function inviteToSlackChannel(
  account: SlackAccountWithToken,
  channelId: string,
  userIds: string[]
): Promise<void> {
  if (userIds.length === 0) return;
  const token = decryptToken(account.access_token_encrypted);
  const data = await callSlackApi(token, "conversations.invite", {
    channel: channelId,
    users: userIds.join(","),
  });
  if (!data.ok) {
    throw new Error(data.error ?? "Slackチャンネルへの招待に失敗しました");
  }
}
