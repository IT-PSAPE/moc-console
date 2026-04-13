import { supabase } from "@/lib/supabase";
import { getCurrentWorkspaceId } from "./current-workspace";
import { mapRow } from "./map-request";
import type { Request, Status } from "@/types/requests";

type RequestRow = Record<string, unknown>;

function selectRequests(workspaceId: string) {
  return supabase
    .from("requests")
    .select("id, title, priority, status, category, created_at, updated_at, due_date, requested_by, who, what, when_text, where_text, why, how, notes, flow, content")
    .eq("workspace_id", workspaceId);
}

export async function fetchRequests(): Promise<Request[]> {
  const workspaceId = await getCurrentWorkspaceId();
  const { data, error } = await selectRequests(workspaceId)
    .neq("status", "archived")
    .order("due_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as RequestRow[]).map(mapRow);
}

export async function fetchRequestsByStatus(status: Status): Promise<Request[]> {
  const workspaceId = await getCurrentWorkspaceId();
  const { data, error } = await selectRequests(workspaceId)
    .eq("status", status)
    .order("due_date", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as RequestRow[]).map(mapRow);
}

export async function fetchRequestById(id: string): Promise<Request | undefined> {
  const workspaceId = await getCurrentWorkspaceId();
  const { data, error } = await selectRequests(workspaceId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapRow(data as RequestRow) : undefined;
}

export async function fetchArchivedRequests(): Promise<Request[]> {
  const workspaceId = await getCurrentWorkspaceId();
  const { data, error } = await selectRequests(workspaceId)
    .eq("status", "archived")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as RequestRow[]).map(mapRow);
}
