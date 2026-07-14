import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth";
import { query } from "@/lib/db";
import { summarizePeriod } from "@/lib/gemini";
import type { ReviewSummary, TagBreakdownEntry } from "@/types";

const schema = z.object({
  periodStart: z.string(),
  periodEnd: z.string(),
});

interface CompletedTaskRow {
  title: string;
  completed_at: string;
  tag_names: string[];
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { periodStart, periodEnd } = schema.parse(await request.json());

  const tasks = await query<CompletedTaskRow>(
    `select t.title, t.completed_at,
       coalesce(json_agg(tg.name) filter (where tg.name is not null), '[]') as tag_names
     from tasks t
     left join task_tags tt on tt.task_id = t.id
     left join tags tg on tg.id = tt.tag_id
     where t.user_id = $1 and t.status = 'done'
       and t.completed_at >= $2 and t.completed_at <= $3
     group by t.id`,
    [userId, `${periodStart}T00:00:00+09:00`, `${periodEnd}T23:59:59+09:00`]
  );

  const tasksForAI = tasks.map((t) => ({
    title: t.title,
    tags: t.tag_names,
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

  const [reviewSummary] = await query<ReviewSummary>(
    `insert into review_summaries (user_id, period_start, period_end, summary_text, tag_breakdown)
     values ($1, $2, $3, $4, $5::jsonb) returning *`,
    [userId, periodStart, periodEnd, summaryText, JSON.stringify(tagBreakdown)]
  );

  return NextResponse.json({ reviewSummary });
}
