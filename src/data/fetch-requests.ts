import type { Request, Status } from "@/types/requests";
import { supabase } from "@/lib/supabase";
import { mapRow } from "./map-request";

/** Fetch all non-archived requests */
export async function fetchRequests(): Promise<Request[]> {
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .neq("status", "archived");

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

/** Fetch requests filtered by status */
export async function fetchRequestsByStatus(
  status: Status,
): Promise<Request[]> {
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("status", status);

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

/** Fetch a single request by id */
export async function fetchRequestById(
  id: string,
): Promise<Request | undefined> {
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapRow(data) : undefined;
}

/** Fetch only archived requests */
export async function fetchArchivedRequests(): Promise<Request[]> {
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("status", "archived");

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}
