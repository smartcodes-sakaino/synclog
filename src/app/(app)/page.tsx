import Header from "@/components/Header";
import AvatarPanel from "@/components/AvatarPanel";
import SkillsPanel from "@/components/SkillsPanel";
import GoalPanel from "@/components/GoalPanel";
import { getCurrentUserId } from "@/lib/auth";
import { getSkillsForUser } from "@/lib/skillsService";
import { getUserLevel } from "@/lib/userLevelService";
import { getGoal } from "@/lib/goalService";

export default async function MyPage() {
  const userId = await getCurrentUserId();
  const [initialSkills, initialUserLevel, initialGoal] = userId
    ? await Promise.all([getSkillsForUser(userId), getUserLevel(userId), getGoal(userId)])
    : [
        [],
        { user_id: "", level: 1, reasoning: null, updated_at: "" },
        { user_id: "", content: null, period_start: null, period_end: null, updated_at: "" },
      ];

  return (
    <>
      <Header title="マイページ" />
      <GoalPanel initialGoal={initialGoal} />
      <div className="grid grid-cols-1 md:grid-cols-5 flex-grow">
        <div className="md:col-span-3 border-b md:border-b-0 md:border-r border-outline-variant/20">
          <AvatarPanel initialUserLevel={initialUserLevel} />
        </div>
        <div className="md:col-span-2">
          <SkillsPanel initialSkills={initialSkills} />
        </div>
      </div>
    </>
  );
}
