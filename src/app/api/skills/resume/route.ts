import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getSkillsForUser } from "@/lib/skillsService";
import { generateResume } from "@/lib/gemini";

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const skills = await getSkillsForUser(userId);
  const resume = await generateResume(
    skills.filter((s) => s.category === "skill"),
    skills.filter((s) => s.category === "experience")
  );

  return NextResponse.json({ resume });
}
