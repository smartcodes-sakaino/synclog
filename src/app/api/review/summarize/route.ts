import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { summarizePeriod } from "@/lib/gemini";
import type { TagBreakdownEntry } from "@/types";

const schema = z.object({
  periodStart: z.string(),
  periodEnd: z.string(),
});

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { periodStart, periodEnd } = schema.parse(await request.json());
  const supabase = getSupabaseAdmin();

  const { data: rows, error } = await supabase
    .from("tasks")
    .select("title, completed_at, task_tags(tags(name))")
    .eq("user_id", userId)
    .eq("status", "done")
    .gte("completed_at", `${periodStart}T00:00:00+09:00`)
    .lte("completed_at", `${periodEnd}T23:59:59+09:00`);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  type Row = {
    title: string;
    completed_at: string;
    task_tags: { tags: { name: string } | null }[];
  };

  const tasks = (rows ?? []) as unknown as Row[];
  const tasksForAI = tasks.map((t) => ({
    title: t.title,
    tags: t.task_tags.map((tt) => tt.tags?.name).filter((n): n is string => Boolean(n)),
    completedAt: t.completed_at,
  }));

  const summaryText = await summarizePeriod(tasksForAI);

  const tagCounts = new Map<string, number>();
  for (const t of tasksForAI) {
    const tagNames = t.tags.length > 0 ? t.tags : ["未分類"];
    for (const tag of tagNames) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const totalTagged = [...tagCounts.values()].reduce((a, b) => a + b, 0) || 1;
  const tagBreakdown: TagBreakdownEntry[] = [...tagCounts.entries()].map(([tag, count]) => ({
    tag,
    percentage: Math.round((count / totalTagged) * 1000) / 10,
  }));

  const { data: saved, error: saveError } = await supabase
    .from("review_summaries")
    .insert({
      user_id: userId,
      period_start: periodStart,
      period_end: periodEnd,
      summary_text: summaryText,
      tag_breakdown: tagBreakdown,
    })
    .select("*")
    .single();

  if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 });
  return NextResponse.json({ reviewSummary: saved });
}
