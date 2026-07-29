import Header from "@/components/Header";
import WorkflowsClient from "@/components/WorkflowsClient";
import { getCurrentUserId } from "@/lib/auth";
import { getWorkflowsForUser } from "@/lib/workflowsService";

export default async function WorkflowsPage() {
  const userId = await getCurrentUserId();
  const initialWorkflows = userId ? await getWorkflowsForUser(userId) : [];

  return (
    <>
      <Header title="ワークフロー" />
      <WorkflowsClient initialWorkflows={initialWorkflows} />
    </>
  );
}
