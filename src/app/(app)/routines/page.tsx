import Header from "@/components/Header";
import RoutinesClient from "@/components/RoutinesClient";
import { getCurrentUserId } from "@/lib/auth";
import { getRoutinesForUser } from "@/lib/routinesService";

export default async function RoutinesPage() {
  const userId = await getCurrentUserId();
  const initialRoutines = userId ? await getRoutinesForUser(userId) : [];

  return (
    <>
      <Header title="定例業務" />
      <RoutinesClient initialRoutines={initialRoutines} />
    </>
  );
}
