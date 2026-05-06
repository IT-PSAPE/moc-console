import type { User } from "@/types/requests";
import { supabase } from "@/lib/supabase";
import { getCurrentWorkspaceId } from "./current-workspace";

export type ResolvedAssignee = User & { duty: string };

type UserRow = {
  id: string;
  name: string;
  surname: string;
  email: string;
  telegram_chat_id: string | null;
};

type RequestAssigneeRow = {
  duty: string;
  users: UserRow | UserRow[] | null;
};

function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    surname: row.surname,
    email: row.email,
    telegramChatId: row.telegram_chat_id,
  };
}

function mapAssigneeRow(row: { duty: string; users: UserRow | UserRow[] | null }): ResolvedAssignee | null {
  const user = Array.isArray(row.users) ? row.users[0] : row.users;
  return user ? { ...mapUserRow(user), duty: row.duty } : null;
}

export async function fetchAssigneesByRequestId(requestId: string): Promise<ResolvedAssignee[]> {
  const workspaceId = await getCurrentWorkspaceId();
  const { data, error } = await supabase
    .from("request_assignees")
    .select("duty, users(id, name, surname, email, telegram_chat_id), requests!inner(workspace_id)")
    .eq("request_id", requestId)
    .eq("requests.workspace_id", workspaceId);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as RequestAssigneeRow[])
    .map(mapAssigneeRow)
    .filter((assignee): assignee is ResolvedAssignee => assignee !== null);
}

export async function fetchAssigneesByCueId(cueId: string): Promise<ResolvedAssignee[]> {
  const { data, error } = await supabase
    .from("cue_assignees")
    .select("duty, users(id, name, surname, email, telegram_chat_id)")
    .eq("cue_id", cueId);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Array<{ duty: string; users: UserRow | UserRow[] | null }>)
    .map(mapAssigneeRow)
    .filter((assignee): assignee is ResolvedAssignee => assignee !== null);
}

export async function fetchAssigneesByChecklistItemId(checklistItemId: string): Promise<ResolvedAssignee[]> {
  const { data, error } = await supabase
    .from("checklist_item_assignees")
    .select("duty, users(id, name, surname, email, telegram_chat_id)")
    .eq("checklist_item_id", checklistItemId);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Array<{ duty: string; users: UserRow | UserRow[] | null }>)
    .map(mapAssigneeRow)
    .filter((assignee): assignee is ResolvedAssignee => assignee !== null);
}

export async function fetchAssigneesByChecklistId(checklistId: string): Promise<Map<string, ResolvedAssignee[]>> {
  const { data, error } = await supabase
    .from("checklist_item_assignees")
    .select("checklist_item_id, duty, users(id, name, surname, email, telegram_chat_id), checklist_items!inner(checklist_id)")
    .eq("checklist_items.checklist_id", checklistId);

  if (error) {
    throw new Error(error.message);
  }

  const result = new Map<string, ResolvedAssignee[]>();
  for (const row of (data ?? []) as Array<{ checklist_item_id: string; duty: string; users: UserRow | UserRow[] | null }>) {
    const assignee = mapAssigneeRow(row);
    if (!assignee) continue;
    const existing = result.get(row.checklist_item_id);
    if (existing) {
      existing.push(assignee);
    } else {
      result.set(row.checklist_item_id, [assignee]);
    }
  }
  return result;
}

export async function fetchAllUsers(): Promise<User[]> {
  const workspaceId = await getCurrentWorkspaceId();
  const { data, error } = await supabase
    .from("workspace_users")
    .select("users(id, name, surname, email, telegram_chat_id)")
    .eq("workspace_id", workspaceId);

  if (error) {
    throw new Error(error.message);
  }

  const seenUserIds = new Set<string>();
  const users = ((data ?? []) as Array<{ users: UserRow | UserRow[] | null }>).flatMap((membership) => {
    const user = Array.isArray(membership.users) ? membership.users[0] : membership.users;

    if (!user || seenUserIds.has(user.id)) {
      return [];
    }

    seenUserIds.add(user.id);
    return [mapUserRow(user)];
  });

  return users.sort((left, right) => {
    const leftName = `${left.name} ${left.surname}`.toLowerCase();
    const rightName = `${right.name} ${right.surname}`.toLowerCase();
    return leftName.localeCompare(rightName);
  });
}
