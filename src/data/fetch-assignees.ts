import type { User } from "@/types/requests";
import { supabase } from "@/lib/supabase";
import { listRequestAssigneesByRequestId } from "./mock-request-store";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, 120 + Math.random() * ms));

/** Resolved assignee with duty for a specific request */
export type ResolvedAssignee = User & { duty: string };

/** Fetch assignees for a given request, joined with their duty */
export async function fetchAssigneesByRequestId(
  requestId: string,
): Promise<ResolvedAssignee[]> {
  await delay(80);
  const assignments = listRequestAssigneesByRequestId(requestId);

  if (assignments.length === 0) {
    return [];
  }

  const userIds = [...new Set(assignments.map((assignment) => assignment.userId))];
  const { data, error } = await supabase
    .from("users")
    .select("id, name, surname, email")
    .in("id", userIds);

  if (error) throw new Error(error.message);

  const usersById = new Map(((data ?? []) as User[]).map((user) => [user.id, user]));

  return assignments.flatMap((assignment) => {
    const user = usersById.get(assignment.userId);
    return user ? [{ ...user, duty: assignment.duty }] : [];
  });
}

/** Fetch all users (for assignment pickers, etc.) */
export async function fetchAllUsers(): Promise<User[]> {
  const { data, error } = await supabase
    .from("users")
    .select("*");

  if (error) throw new Error(error.message);
  return (data ?? []) as User[];
}
