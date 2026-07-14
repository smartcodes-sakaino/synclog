import { google } from "googleapis";
import { getAuthorizedClientForAccount } from "@/lib/google/oauth";
import type { GoogleAccount } from "@/types";

type AccountRow = GoogleAccount & {
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
};

function buildRawMessage(to: string, subject: string, body: string): string {
  const message = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    body,
  ].join("\r\n");

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// 日報の下書きをGmailに作成する(送信は行わない)
export async function createGmailDraft(
  account: AccountRow,
  to: string,
  subject: string,
  body: string
): Promise<string> {
  const auth = await getAuthorizedClientForAccount(account);
  const gmail = google.gmail({ version: "v1", auth });
  const raw = buildRawMessage(to, subject, body);

  const res = await gmail.users.drafts.create({
    userId: "me",
    requestBody: { message: { raw } },
  });

  if (!res.data.id) {
    throw new Error("Gmail下書きの作成に失敗しました");
  }
  return res.data.id;
}
