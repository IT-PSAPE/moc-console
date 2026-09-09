import type { Role } from "@moc/types/requests/assignee";
import { supabase } from "@moc/data/supabase";

export type UserWithRole = {
  id: string;
  name: string;
  surname: string;
  email: string;
  telegramChatId: string | null;
  avatarUrl: string | null;
  currentDuty: string | null;
  statusMessage: string | null;
  workspaceIds: string[];
  role: Role | null;
};

export type PendingWorkspaceUser = Omit<UserWithRole, "role" | "workspaceIds"> & {
  requestId: string;
  requestedAt: string;
};

type UserRow = {
  id: string;
  name: string;
  surname: string;
  email: string;
  telegram_chat_id: string | null;
  avatar_url: string | null;
  current_duty: string | null;
  status_message: string | null;
};

type WorkspaceUserRow = {
  users: UserRow | UserRow[] | null;
  roles: Role | Role[] | null;
};

type PendingWorkspaceUserRow = {
  id: string;
  requested_at: string;
  users: UserRow | UserRow[] | null;
};

function first<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

/** Fetch accepted members and their role in one workspace. */
export async function fetchUsersWithRoles(workspaceId: string): Promise<UserWithRole[]> {
  const { data, error } = await supabase
    .from("workspace_users")
    .select("users(id, name, surname, email, telegram_chat_id, avatar_url, current_duty, status_message), roles(id, name, can_create, can_read, can_update, can_delete, can_manage_roles)")
    .eq("workspace_id", workspaceId);

  if (error) throw new Error(error.message);

  return ((data ?? []) as WorkspaceUserRow[]).flatMap((membership) => {
    const user = first(membership.users);
    if (!user) return [];
    return [{
      id: user.id,
      name: user.name,
      surname: user.surname,
      email: user.email,
      telegramChatId: user.telegram_chat_id,
      avatarUrl: user.avatar_url,
      currentDuty: user.current_duty,
      statusMessage: user.status_message,
      workspaceIds: [workspaceId],
      role: first(membership.roles),
    }];
  });
}

export async function fetchPendingWorkspaceUsers(workspaceId: string): Promise<PendingWorkspaceUser[]> {
  const { data, error } = await supabase
    .from("workspace_join_requests")
    .select("id, requested_at, users(id, name, surname, email, telegram_chat_id, avatar_url, current_duty, status_message)")
    .eq("workspace_id", workspaceId)
    .order("requested_at");

  if (error) throw new Error(error.message);

  return ((data ?? []) as PendingWorkspaceUserRow[]).flatMap((request) => {
    const user = first(request.users);
    if (!user) return [];
    return [{
      id: user.id,
      name: user.name,
      surname: user.surname,
      email: user.email,
      telegramChatId: user.telegram_chat_id,
      avatarUrl: user.avatar_url,
      currentDuty: user.current_duty,
      statusMessage: user.status_message,
      requestId: request.id,
      requestedAt: request.requested_at,
    }];
  });
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
  fields: {
    name?: string;
    surname?: string;
    avatar_url?: string | null;
    current_duty?: string | null;
    status_message?: string | null;
  },
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

/** Assign a role inside one workspace. */
export async function assignUserRole(workspaceId: string, userId: string, roleId: string) {
  const { error } = await supabase.rpc("set_workspace_member_role", {
    p_workspace_id: workspaceId,
    p_user_id: userId,
    p_role_id: roleId,
  });

  if (error) throw new Error(error.message);
}

export async function approveWorkspaceJoinRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc("approve_workspace_join_request", { p_request_id: requestId });
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
