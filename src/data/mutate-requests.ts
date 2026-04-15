import { supabase } from "@/lib/supabase";
import { getCurrentWorkspaceId } from "./current-workspace";
import { mapRow, toRow } from "./map-request";
import type { Request, Status } from "@/types/requests";

export async function updateRequest(request: Request): Promise<Request> {
  const workspaceId = await getCurrentWorkspaceId();
  const payload = {
    ...toRow(request),
    workspace_id: workspaceId,
  };

  const { data, error } = await supabase
    .from("requests")
    .upsert(payload, { onConflict: "id" })
    .select("id, title, priority, status, category, created_at, updated_at, due_date, requested_by, who, what, when_text, where_text, why, how, notes, flow, content")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRow(data);
}

export async function archiveRequest(id: string): Promise<void> {
  await updateRequestStatus(id, "archived");
}

export async function unarchiveRequest(id: string): Promise<void> {
  await updateRequestStatus(id, "not_started");
}

export async function updateRequestStatus(id: string, status: Status): Promise<void> {
  const { error } = await supabase
    .from("requests")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteRequest(id: string): Promise<void> {
  const { error } = await supabase
    .from("requests")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function addRequestAssignee(requestId: string, userId: string, duty: string): Promise<void> {
  const deleteResult = await supabase
    .from("request_assignees")
    .delete()
    .eq("request_id", requestId)
    .eq("user_id", userId);

  if (deleteResult.error) {
    throw new Error(deleteResult.error.message);
  }

  const { error } = await supabase
    .from("request_assignees")
    .insert({
      request_id: requestId,
      user_id: userId,
      duty,
    });

  if (error) {
    throw new Error(error.message);
  }
}

export async function removeRequestAssignee(requestId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("request_assignees")
    .delete()
    .eq("request_id", requestId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}
