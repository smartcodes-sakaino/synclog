import { query } from "@/lib/db";
import type { Workflow } from "@/types";

export async function getWorkflowsForUser(userId: string): Promise<Workflow[]> {
  return query<Workflow>("select * from workflows where user_id = $1 order by created_at asc", [userId]);
}
