import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getCurrentUserId } from "@/lib/auth";

const createSchema = z.object({
  title: z.string().min(1),
  memo: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const status = new URL(request.url).searchParams.get("status");
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("fuzzy_tasks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ fuzzyTasks: data });
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = createSchema.parse(await request.json());
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("fuzzy_tasks")
    .insert({ user_id: userId, title: body.title, memo: body.memo ?? null })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ fuzzyTask: data }, { status: 201 });
}
