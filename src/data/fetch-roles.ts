import { supabase } from "@/lib/supabase";

/** Fetch all available roles */
export async function fetchRoles(): Promise<string[]> {
  const { data, error } = await supabase
    .from("roles")
    .select("name");

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.name);
}
