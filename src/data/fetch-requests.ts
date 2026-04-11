import type { Request, Status } from "@/types/requests";
import { findRequestById, listRequests } from "./mock-request-store";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * ms));

/** Fetch all non-archived requests */
export async function fetchRequests(): Promise<Request[]> {
  await delay(120);
  return listRequests().filter((request) => request.status !== "archived");
}

/** Fetch requests filtered by status */
export async function fetchRequestsByStatus(
  status: Status,
): Promise<Request[]> {
  await delay(120);
  return listRequests().filter((request) => request.status === status);
}

/** Fetch a single request by id */
export async function fetchRequestById(
  id: string,
): Promise<Request | undefined> {
  await delay(80);
  return findRequestById(id);
}

/** Fetch only archived requests */
export async function fetchArchivedRequests(): Promise<Request[]> {
  await delay(120);
  return listRequests().filter((request) => request.status === "archived");
}
