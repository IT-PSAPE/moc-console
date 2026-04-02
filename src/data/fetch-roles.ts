import { supabase } from "@/lib/supabase";

/** Fetch all available duty roles for request assignments */
export async function fetchRoles(): Promise<string[]> {
  const { data, error } = await supabase
    .from("request_roles")
    .select("name");

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.name);
}
