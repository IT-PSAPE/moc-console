import type { Role } from "@moc/types/requests/assignee";
import { supabase } from "@moc/data/supabase";

export type UserWithRole = {
  id: string;
  name: string;
  surname: string;
  email: string;
  telegramChatId: string | null;
  avatarUrl: string | null;
  workspaceIds: string[];
  role: Role | null;
};

type UserRow = {
  id: string;
  name: string;
  surname: string;
  email: string;
  telegram_chat_id: string | null;
  avatar_url: string | null;
};

/** Fetch all users with their assigned role */
export async function fetchUsersWithRoles(): Promise<UserWithRole[]> {
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, name, surname, email, telegram_chat_id, avatar_url");

  if (usersError) throw new Error(usersError.message);

  const { data: userRoles, error: rolesError } = await supabase
    .from("user_roles")
    .select("user_id, roles(id, name, can_create, can_read, can_update, can_delete, can_manage_roles)");

  if (rolesError) throw new Error(rolesError.message);

  const roleByUserId = new Map<string, Role>();
  for (const ur of userRoles ?? []) {
    const role = Array.isArray(ur.roles) ? ur.roles[0] : ur.roles;
    if (role) {
      roleByUserId.set(ur.user_id, role as Role);
    }
  }

  return ((users ?? []) as UserRow[]).map((u) => ({
    id: u.id,
    name: u.name,
    surname: u.surname,
    email: u.email,
    telegramChatId: u.telegram_chat_id,
    avatarUrl: u.avatar_url,
    workspaceIds: [],
    role: roleByUserId.get(u.id) ?? null,
  }));
}

/** Fetch all available roles */
export async function fetchAvailableRoles(): Promise<Role[]> {
  const { data, error } = await supabase
    .from("roles")
    .select("id, name, can_create, can_read, can_update, can_delete, can_manage_roles");

  if (error) throw new Error(error.message);
  return (data ?? []) as Role[];
}

/** Update a user's profile fields */
export async function updateUserProfile(
  userId: string,
  fields: { name?: string; surname?: string; avatar_url?: string | null },
) {
  const { error } = await supabase
    .from("users")
    .update(fields)
    .eq("id", userId);

  if (error) throw new Error(error.message);
}

/**
 * Upload an avatar image for a user and persist the public URL on
 * public.users.avatar_url. Storage RLS restricts writes to paths
 * prefixed with the caller's auth.uid() (see phase-26-user-avatars.sql).
 */
export async function uploadUserAvatar(userId: string, file: Blob): Promise<string> {
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg",
    });
  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const publicUrl = data.publicUrl;

  await updateUserProfile(userId, { avatar_url: publicUrl });
  return publicUrl;
}

/** Clear a user's avatar_url. Does not delete the storage object. */
export async function removeUserAvatar(userId: string) {
  await updateUserProfile(userId, { avatar_url: null });
}

/** Assign a role to a user (upserts into user_roles) */
export async function assignUserRole(userId: string, roleId: string) {
  const { error } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role_id: roleId }, { onConflict: "user_id" });

  if (error) throw new Error(error.message);
}

/** Create a one-time token for the Telegram bot deep-link flow. */
export async function createTelegramLinkToken(userId: string): Promise<{ token: string }> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await supabase.from("telegram_link_tokens").delete().eq("user_id", userId);

  const { error } = await supabase
    .from("telegram_link_tokens")
    .insert({ token, user_id: userId });

  if (error) throw new Error(error.message);
  return { token };
}

/** Clear the user's telegram_chat_id. */
export async function unlinkTelegram(userId: string): Promise<void> {
  const { error } = await supabase
    .from("users")
    .update({ telegram_chat_id: null })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}
