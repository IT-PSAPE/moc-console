import type { Request, Status } from "@/types/requests";
import { supabase } from "@/lib/supabase";
import { mapRow, toRow } from "./map-request";

/** Save (insert or update) a request. Returns the persisted request. */
export async function updateRequest(request: Request): Promise<Request> {
  const { data, error } = await supabase
    .from("requests")
    .upsert(toRow(request))
    .select()
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data);
}

/** Archive a request by setting its status to 'archived' */
export async function archiveRequest(id: string): Promise<void> {
  const { error } = await supabase
    .from("requests")
    .update({ status: "archived" })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/** Unarchive a request by resetting its status to 'not_started' */
export async function unarchiveRequest(id: string): Promise<void> {
  const { error } = await supabase
    .from("requests")
    .update({ status: "not_started" })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/** Update just the status of a request */
export async function updateRequestStatus(id: string, status: Status): Promise<void> {
  const { error } = await supabase
    .from("requests")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/** Delete a request (cascades to request_assignees) */
export async function deleteRequest(id: string): Promise<void> {
  const { error } = await supabase
    .from("requests")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/** Add a user to a request with a specific duty */
export async function addRequestAssignee(
  requestId: string,
  userId: string,
  duty: string,
): Promise<void> {
  const { error } = await supabase
    .from("request_assignees")
    .insert({ request_id: requestId, user_id: userId, duty });

  if (error) throw new Error(error.message);
}

/** Remove a user from a request */
export async function removeRequestAssignee(
  requestId: string,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("request_assignees")
    .delete()
    .eq("request_id", requestId)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}
