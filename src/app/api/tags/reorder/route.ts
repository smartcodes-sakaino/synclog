import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

const schema = z.object({
  tagIds: z.array(z.string()).min(1),
});

// タグの表示順(sort_order)をドラッグ&ドロップ後の並びに更新する
export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { tagIds } = schema.parse(await request.json());

  await Promise.all(
    tagIds.map((tagId, index) =>
      query("update tags set sort_order = $1 where id = $2 and user_id = $3", [index, tagId, userId])
    )
  );

  return NextResponse.json({ ok: true });
}
