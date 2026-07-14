import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth";
import { query } from "@/lib/db";
import type { MinuteSource } from "@/types";

const createSchema = z.object({
  docUrl: z.string().url(),
  title: z.string().min(1),
});

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sources = await query<MinuteSource & { extracted_task_count: number }>(
    `select ms.*, coalesce(count(et.id), 0)::int as extracted_task_count
     from minute_sources ms
     left join extracted_tasks et on et.minute_source_id = ms.id
     where ms.user_id = $1
     group by ms.id
     order by ms.created_at desc`,
    [userId]
  );

  return NextResponse.json({ sources });
}

// 定例MTGの議事録ドキュメントを登録する(継続的にチェックする対象として保存)
export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = createSchema.parse(await request.json());
  const [source] = await query<MinuteSource>(
    "insert into minute_sources (user_id, type, doc_url, title) values ($1, 'recurring', $2, $3) returning *",
    [userId, body.docUrl, body.title]
  );

  return NextResponse.json({ source }, { status: 201 });
}
