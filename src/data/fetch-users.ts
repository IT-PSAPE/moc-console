import type { Role } from "@/types/requests/assignee";
import { supabase } from "@/lib/supabase";

export type UserWithRole = {
  id: string;
  name: string;
  surname: string;
  email: string;
  role: Role | null;
};

/** Fetch all users with their assigned role */
export async function fetchUsersWithRoles(): Promise<UserWithRole[]> {
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, name, surname, email");

  if (usersError) throw new Error(usersError.message);

  const { data: userRoles, error: rolesError } = await supabase
    .from("user_roles")
    .select("user_id, roles(id, name, can_create, can_read, can_update, can_delete, can_manage_roles, can_manage_assignees)");

  if (rolesError) throw new Error(rolesError.message);

  const roleByUserId = new Map<string, Role>();
  for (const ur of userRoles ?? []) {
    const role = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
    if (role) {
      roleByUserId.set(ur.user_id, role as Role);
    }
  }

  return (users ?? []).map((u) => ({
    ...u,
    role: roleByUserId.get(u.id) ?? null,
  }));
}

/** Fetch all available roles */
export async function fetchAvailableRoles(): Promise<Role[]> {
  const { data, error } = await supabase
    .from("roles")
    .select("id, name, can_create, can_read, can_update, can_delete, can_manage_roles, can_manage_assignees");

  if (error) throw new Error(error.message);
  return (data ?? []) as Role[];
}

/** Update a user's profile fields */
export async function updateUserProfile(userId: string, fields: { name?: string; surname?: string }) {
  const { error } = await supabase
    .from("users")
    .update(fields)
    .eq("id", userId);

  if (error) throw new Error(error.message);
}

/** Assign a role to a user (upserts into user_roles) */
export async function assignUserRole(userId: string, roleId: string) {
  const { error } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role_id: roleId }, { onConflict: "user_id" });

  if (error) throw new Error(error.message);
}
