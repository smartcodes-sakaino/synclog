import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

const schema = z.object({
  extractedTaskIds: z.array(z.string()).min(1),
});

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { extractedTaskIds } = schema.parse(await request.json());
  const supabase = getSupabaseAdmin();

  const { data: candidates, error } = await supabase
    .from("extracted_tasks")
    .select("*")
    .eq("user_id", userId)
    .in("id", extractedTaskIds)
    .eq("status", "pending");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ tasks: [] });
  }

  const newTasks = candidates.map((c) => ({
    user_id: userId,
    title: c.title,
    description: c.description,
    due_date: c.suggested_due_date,
    source: "minutes_extraction" as const,
    source_ref: c.minute_source_id,
  }));

  const { data: createdTasks, error: insertError } = await supabase
    .from("tasks")
    .insert(newTasks)
    .select("*");

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  await supabase
    .from("extracted_tasks")
    .update({ status: "imported" })
    .in("id", extractedTaskIds);

  return NextResponse.json({ tasks: createdTasks }, { status: 201 });
}
