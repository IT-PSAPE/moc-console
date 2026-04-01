import type { Request } from "@/types/requests";

/** Simulate network latency */
function delay(ms = 800) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Simulate saving a request. Returns the updated request on success. */
export async function updateRequest(request: Request): Promise<Request> {
  await delay();
  // TODO: Supabase — upsert request row
  return request;
}

/** Simulate archiving a request */
export async function archiveRequest(id: string): Promise<void> {
  await delay();
  // TODO: Supabase — update status to 'archived'
  void id;
}

/** Simulate deleting a request */
export async function deleteRequest(id: string): Promise<void> {
  await delay();
  // TODO: Supabase — delete request row
  void id;
}
