import Header from "@/components/Header";
import AvatarPanel from "@/components/AvatarPanel";
import SkillsPanel from "@/components/SkillsPanel";
import { getCurrentUserId } from "@/lib/auth";
import { getSkillsForUser } from "@/lib/skillsService";

export default async function MyPage() {
  const userId = await getCurrentUserId();
  const initialSkills = userId ? await getSkillsForUser(userId) : [];

  return (
    <>
      <Header title="マイページ" />
      <div className="grid grid-cols-1 md:grid-cols-2 flex-grow">
        <div className="border-b md:border-b-0 md:border-r border-outline-variant/20">
          <AvatarPanel />
        </div>
        <SkillsPanel initialSkills={initialSkills} />
      </div>
    </>
  );
}
