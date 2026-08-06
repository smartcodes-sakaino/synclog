import { query } from "@/lib/db";
import { generateCompanionMessage } from "@/lib/gemini";
import { todayInJST, currentHourInJST } from "@/lib/date";
import type { CompanionContext } from "@/lib/gemini";

function timeOfDayInJST(): CompanionContext["timeOfDay"] {
  const hour = currentHourInJST();
  if (hour < 11) return "morning";
  if (hour < 17) return "midday";
  if (hour < 21) return "evening";
  return "night";
}

export async function buildCompanionMessage(userId: string): Promise<string> {
  const dateISO = todayInJST();
  const start = `${dateISO}T00:00:00+09:00`;
  const end = `${dateISO}T23:59:59+09:00`;

  const [dueToday, completedToday] = await Promise.all([
    query<{ title: string }>(
      "select title from tasks where user_id = $1 and due_date = $2 and status != 'done'",
      [userId, dateISO]
    ),
    query<{ title: string }>(
      "select title from tasks where user_id = $1 and status = 'done' and completed_at >= $2 and completed_at <= $3",
      [userId, start, end]
    ),
  ]);

  return generateCompanionMessage({
    timeOfDay: timeOfDayInJST(),
    dueTodayTitles: dueToday.map((t) => t.title),
    completedTodayTitles: completedToday.map((t) => t.title),
  });
}
