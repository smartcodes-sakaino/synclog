import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

const createSchema = z.object({
  docUrl: z.string().url(),
  title: z.string().min(1),
});

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("minute_sources")
    .select("*, extracted_tasks(count)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sources: data });
}

// 定例MTGの議事録ドキュメントを登録する(継続的にチェックする対象として保存)
export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = createSchema.parse(await request.json());
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("minute_sources")
    .insert({ user_id: userId, type: "recurring", doc_url: body.docUrl, title: body.title })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ source: data }, { status: 201 });
}
