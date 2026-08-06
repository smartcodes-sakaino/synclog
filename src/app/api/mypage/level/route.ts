import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getSkillsForUser } from "@/lib/skillsService";
import { getUserLevel, saveUserLevel } from "@/lib/userLevelService";
import { assessSocialLevel } from "@/lib/gemini";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const userLevel = await getUserLevel(userId);
  return NextResponse.json({ userLevel });
}

// 「レベルを判定する」ボタン専用。登録済みのスキル・職務経歴をもとにAIで再判定する
export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const skills = await getSkillsForUser(userId);
  const result = await assessSocialLevel(
    skills.filter((s) => s.category === "skill"),
    skills.filter((s) => s.category === "experience")
  );
  const userLevel = await saveUserLevel(userId, result.level, result.reasoning);
  return NextResponse.json({ userLevel });
}
