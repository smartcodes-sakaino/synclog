import Header from "@/components/Header";
import DashboardClient from "@/components/DashboardClient";
import { getCurrentUserId } from "@/lib/auth";
import { getTasksForUser } from "@/lib/tasksService";
import { getTagsForUser } from "@/lib/tags";

export default async function DashboardPage() {
  const userId = await getCurrentUserId();
  // (app)/layout.tsxで未ログイン時は既に/loginへリダイレクトされているため、ここでは必ず存在する
  const [initialTasks, initialTags] = userId
    ? await Promise.all([getTasksForUser(userId), getTagsForUser(userId)])
    : [[], []];

  return (
    <>
      <Header title="タスク" />
      <DashboardClient initialTasks={initialTasks} initialTags={initialTags} />
    </>
  );
}
