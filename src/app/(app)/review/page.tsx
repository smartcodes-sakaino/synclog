import Header from "@/components/Header";
import ReviewClient from "@/components/ReviewClient";
import { getCurrentUserId } from "@/lib/auth";
import { getGoal } from "@/lib/goalService";

export default async function ReviewPage() {
  const userId = await getCurrentUserId();
  const goal = userId ? await getGoal(userId) : null;

  return (
    <>
      <Header title="Review" />
      <ReviewClient initialPeriodStart={goal?.period_start ?? null} initialPeriodEnd={goal?.period_end ?? null} />
    </>
  );
}
