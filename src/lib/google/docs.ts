import { google } from "googleapis";
import { getAuthorizedClientForAccount } from "@/lib/google/oauth";
import type { GoogleAccount } from "@/types";

type AccountRow = GoogleAccount & {
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
};

export function extractDocId(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) {
    throw new Error("GoogleドキュメントのURLからIDを取得できませんでした");
  }
  return match[1];
}

// Googleドキュメント本文をプレーンテキストとして取得する
export async function fetchDocText(account: AccountRow, docUrl: string): Promise<string> {
  const documentId = extractDocId(docUrl);
  const auth = await getAuthorizedClientForAccount(account);
  const docs = google.docs({ version: "v1", auth });
  const res = await docs.documents.get({ documentId });

  const content = res.data.body?.content ?? [];
  const lines: string[] = [];
  for (const element of content) {
    const paragraph = element.paragraph;
    if (!paragraph?.elements) continue;
    const line = paragraph.elements
      .map((e) => e.textRun?.content ?? "")
      .join("");
    if (line.trim()) lines.push(line.trim());
  }
  return lines.join("\n");
}
