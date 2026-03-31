import type { Request, Status } from "@/types/requests";
import data from "./requests.json";

const requests = data as Request[];

/** Simulate network latency */
function delay(ms = 300) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Fetch all non-archived requests */
export async function fetchRequests(): Promise<Request[]> {
  await delay();
  return requests.filter((r) => r.status !== "archived");
}

/** Fetch requests filtered by status */
export async function fetchRequestsByStatus(
  status: Status,
): Promise<Request[]> {
  await delay();
  return requests.filter((r) => r.status === status);
}

/** Fetch a single request by id */
export async function fetchRequestById(
  id: string,
): Promise<Request | undefined> {
  await delay();
  return requests.find((r) => r.id === id);
}

/** Fetch only archived requests */
export async function fetchArchivedRequests(): Promise<Request[]> {
  await delay();
  return requests.filter((r) => r.status === "archived");
}
