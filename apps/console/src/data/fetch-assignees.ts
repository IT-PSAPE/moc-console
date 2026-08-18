import type { User } from "@moc/types/requests";
import { supabase } from "@moc/data/supabase";
import { getCurrentWorkspaceId } from "./current-workspace";

// duty is request-only: checklist-item assignment carries no duty label.
export type ResolvedAssignee = User & { duty?: string };

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

type RequestAssigneeRow = {
  duty: string;
  users: UserRow | UserRow[] | null;
};

const USER_COLUMNS = "id, name, surname, email, telegram_chat_id, avatar_url, current_duty, status_message";

function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    surname: row.surname,
    email: row.email,
    telegramChatId: row.telegram_chat_id,
    avatarUrl: row.avatar_url,
    currentDuty: row.current_duty,
    statusMessage: row.status_message,
  };
}

function mapAssigneeRow(users: UserRow | UserRow[] | null, duty?: string): ResolvedAssignee | null {
  const user = Array.isArray(users) ? users[0] : users;
  if (!user) return null;
  return duty === undefined ? mapUserRow(user) : { ...mapUserRow(user), duty };
}

function mapRequestAssigneeRow(row: RequestAssigneeRow): ResolvedAssignee | null {
  return mapAssigneeRow(row.users, row.duty);
}

export async function fetchAssigneesByRequestId(requestId: string): Promise<ResolvedAssignee[]> {
  const workspaceId = await getCurrentWorkspaceId();
  const { data, error } = await supabase
    .from("request_assignees")
    .select(`duty, users(${USER_COLUMNS}), requests!inner(workspace_id)`)
    .eq("request_id", requestId)
    .eq("requests.workspace_id", workspaceId);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as RequestAssigneeRow[])
    .map(mapRequestAssigneeRow)
    .filter((assignee): assignee is ResolvedAssignee => assignee !== null);
}

export async function fetchAssigneesByChecklistId(checklistId: string): Promise<Map<string, ResolvedAssignee[]>> {
  const workspaceId = await getCurrentWorkspaceId();
  const { data, error } = await supabase
    .from("checklist_item_assignees")
    .select(`checklist_item_id, users(${USER_COLUMNS}), checklist_items!inner(checklist_id, checklists!inner(workspace_id))`)
    .eq("checklist_items.checklist_id", checklistId)
    .eq("checklist_items.checklists.workspace_id", workspaceId);

  if (error) {
    throw new Error(error.message);
  }

  const assigneesByItemId = new Map<string, ResolvedAssignee[]>();
  for (const row of (data ?? []) as Array<{ checklist_item_id: string; users: UserRow | UserRow[] | null }>) {
    const assignee = mapAssigneeRow(row.users);
    if (!assignee) continue;
    assigneesByItemId.set(row.checklist_item_id, [...(assigneesByItemId.get(row.checklist_item_id) ?? []), assignee]);
  }

  return assigneesByItemId;
}

export async function fetchAllUsers(workspaceId?: string): Promise<User[]> {
  const resolvedWorkspaceId = workspaceId ?? await getCurrentWorkspaceId();
  const { data, error } = await supabase
    .from("workspace_users")
    .select(`users(${USER_COLUMNS})`)
    .eq("workspace_id", resolvedWorkspaceId);

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
