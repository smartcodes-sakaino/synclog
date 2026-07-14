import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getCurrentUserId } from "@/lib/auth";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  memo: z.string().nullable().optional(),
  status: z.enum(["open", "resolved"]).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = updateSchema.parse(await request.json());
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("fuzzy_tasks")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ fuzzyTask: data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("fuzzy_tasks").delete().eq("id", id).eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
