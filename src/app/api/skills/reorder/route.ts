import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";
import { getCurrentUserId } from "@/lib/auth";

const schema = z.object({
  skillIds: z.array(z.string()).min(1),
});

// スキル/職務経歴の表示順(sort_order)をドラッグ&ドロップ後の並びに更新する
// (category内での並び替えのみを想定し、渡されたIDの並び順をそのまま反映する)
export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { skillIds } = schema.parse(await request.json());

  await Promise.all(
    skillIds.map((id, index) =>
      query("update skills set sort_order = $1 where id = $2 and user_id = $3", [index, id, userId])
    )
  );

  return NextResponse.json({ ok: true });
}
