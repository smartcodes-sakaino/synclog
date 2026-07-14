import { query } from "@/lib/db";
import { getPrimaryGoogleAccount } from "@/lib/googleAccounts";
import { fetchDocText } from "@/lib/google/docs";
import { extractTasksFromMinutes } from "@/lib/gemini";
import type { ExtractedTask, MinuteSource } from "@/types";

export async function extractTasksFromDocument(
  userId: string,
  docUrl: string,
  existingMinuteSourceId?: string
): Promise<{ minuteSource: MinuteSource; extractedTasks: ExtractedTask[] }> {
  const account = await getPrimaryGoogleAccount(userId);
  if (!account) throw new Error("Googleアカウントが連携されていません");

  let minuteSource: MinuteSource;

  if (existingMinuteSourceId) {
    const [row] = await query<MinuteSource>(
      "update minute_sources set last_checked_at = now() where id = $1 and user_id = $2 returning *",
      [existingMinuteSourceId, userId]
    );
    if (!row) throw new Error("議事録ソースが見つかりません");
    minuteSource = row;
  } else {
    // 単発(謎MTG等)の抽出も履歴に残すため、その都度adhocソースとして登録する
    const [row] = await query<MinuteSource>(
      `insert into minute_sources (user_id, type, doc_url, title, last_checked_at)
       values ($1, 'adhoc', $2, '単発の議事録', now()) returning *`,
      [userId, docUrl]
    );
    minuteSource = row;
  }

  const docText = await fetchDocText(account, docUrl);
  const candidates = await extractTasksFromMinutes(docText);

  if (candidates.length === 0) {
    return { minuteSource, extractedTasks: [] };
  }

  const extractedTasks: ExtractedTask[] = [];
  for (const c of candidates) {
    const [row] = await query<ExtractedTask>(
      `insert into extracted_tasks (user_id, minute_source_id, title, description, suggested_due_date, status)
       values ($1, $2, $3, $4, $5, 'pending') returning *`,
      [userId, minuteSource.id, c.title, c.description, c.suggestedDueDate]
    );
    extractedTasks.push(row);
  }

  return { minuteSource, extractedTasks };
}
