import { getSupabaseAdmin } from "@/lib/supabase";
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

  const supabase = getSupabaseAdmin();
  let minuteSource: MinuteSource;

  if (existingMinuteSourceId) {
    const { data, error } = await supabase
      .from("minute_sources")
      .update({ last_checked_at: new Date().toISOString() })
      .eq("id", existingMinuteSourceId)
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw error;
    minuteSource = data;
  } else {
    // 単発(謎MTG等)の抽出も履歴に残すため、その都度adhocソースとして登録する
    const { data, error } = await supabase
      .from("minute_sources")
      .insert({
        user_id: userId,
        type: "adhoc",
        doc_url: docUrl,
        title: "単発の議事録",
        last_checked_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) throw error;
    minuteSource = data;
  }

  const docText = await fetchDocText(account, docUrl);
  const candidates = await extractTasksFromMinutes(docText);

  const rows = candidates.map((c) => ({
    user_id: userId,
    minute_source_id: minuteSource.id,
    title: c.title,
    description: c.description,
    suggested_due_date: c.suggestedDueDate,
    status: "pending" as const,
  }));

  if (rows.length === 0) {
    return { minuteSource, extractedTasks: [] };
  }

  const { data: extractedTasks, error: insertError } = await supabase
    .from("extracted_tasks")
    .insert(rows)
    .select("*");

  if (insertError) throw insertError;
  return { minuteSource, extractedTasks: extractedTasks ?? [] };
}
