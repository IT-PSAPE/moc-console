import type { Assignee, RequestAssignee } from "@/types/requests";
import assigneesData from "./assignees.json";
import joinData from "./request-assignees.json";

const assignees = assigneesData as Assignee[];
const requestAssignees = joinData as RequestAssignee[];

/** Simulate network latency */
function delay(ms = 300) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Resolved assignee with duty for a specific request */
export type ResolvedAssignee = Assignee & { duty: string };

/** Fetch assignees for a given request, joined with their duty */
export async function fetchAssigneesByRequestId(
  requestId: string,
): Promise<ResolvedAssignee[]> {
  await delay();
  const joins = requestAssignees.filter((ra) => ra.requestId === requestId);
  return joins
    .map((join) => {
      const assignee = assignees.find((a) => a.id === join.assigneeId);
      if (!assignee) return null;
      return { ...assignee, duty: join.duty };
    })
    .filter((a): a is ResolvedAssignee => a !== null);
}

/** Fetch all assignees (for assignment pickers, etc.) */
export async function fetchAllAssignees(): Promise<Assignee[]> {
  await delay();
  return assignees;
}
