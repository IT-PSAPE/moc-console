import type { User } from "@/types/requests";
import { supabase } from "@/lib/supabase";

/** Resolved assignee with duty for a specific request */
export type ResolvedAssignee = User & { duty: string };

/** Fetch assignees for a given request, joined with their duty */
export async function fetchAssigneesByRequestId(
  requestId: string,
): Promise<ResolvedAssignee[]> {
  const { data, error } = await supabase
    .from("request_assignees")
    .select("duty, users(id, name, surname, email)")
    .eq("request_id", requestId);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const user = row.users as unknown as User;
    return { ...user, duty: row.duty };
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
