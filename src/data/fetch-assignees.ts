import type { Assignee } from "@/types/requests";
import { supabase } from "@/lib/supabase";

/** Resolved assignee with duty for a specific request */
export type ResolvedAssignee = Assignee & { duty: string };

/** Fetch assignees for a given request, joined with their duty */
export async function fetchAssigneesByRequestId(
  requestId: string,
): Promise<ResolvedAssignee[]> {
  const { data, error } = await supabase
    .from("request_assignees")
    .select("duty, assignees(id, name, surname)")
    .eq("request_id", requestId);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const assignee = row.assignees as unknown as Assignee;
    return { ...assignee, duty: row.duty };
  });
}

/** Fetch all assignees (for assignment pickers, etc.) */
export async function fetchAllAssignees(): Promise<Assignee[]> {
  const { data, error } = await supabase
    .from("assignees")
    .select("*");

  if (error) throw new Error(error.message);
  return (data ?? []) as Assignee[];
}
