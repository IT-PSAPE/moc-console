import data from "./roles.json";

const roles = data as string[];

function delay(ms = 300) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/** Fetch all available roles */
export async function fetchRoles(): Promise<string[]> {
  await delay();
  return roles;
}
