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

export async function fetchAssigneesByRequestId(requestId: string): Promise<ResolvedAssignee[]> {
  const { data, error } = await supabase
    .from("request_assignees")
    .select("duty, users(id, name, surname, email, telegram_chat_id)")
    .eq("request_id", requestId);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as RequestAssigneeRow[]).flatMap((assignment) => {
    const user = Array.isArray(assignment.users) ? assignment.users[0] : assignment.users;
    return user ? [{ ...mapUserRow(user), duty: assignment.duty }] : [];
  });
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
