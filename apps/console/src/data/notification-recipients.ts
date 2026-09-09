import { supabase } from "@moc/data/supabase";
import type { User } from "@moc/types/requests";

// People who receive stale-item Telegram alerts. A recipient is a
// workspace user; DMs only land for those with a linked telegram_chat_id
// (surfaced in the settings UI). Membership is the on/off switch — remove
// a person to stop alerting them.
export type NotificationRecipient = User & { recipientId: string };

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

type Row = {
  id: string;
  users: UserRow | UserRow[] | null;
};

const USER_COLUMNS = "id, name, surname, email, telegram_chat_id, avatar_url, current_duty, status_message";

function mapRow(row: Row): NotificationRecipient | null {
  const user = Array.isArray(row.users) ? row.users[0] : row.users;
  if (!user) return null;
  return {
    recipientId: row.id,
    id: user.id,
    name: user.name,
    surname: user.surname,
    email: user.email,
    telegramChatId: user.telegram_chat_id,
    avatarUrl: user.avatar_url,
    currentDuty: user.current_duty,
    statusMessage: user.status_message,
  };
}

export async function fetchNotificationRecipients(workspaceId: string): Promise<NotificationRecipient[]> {
  const { data, error } = await supabase
    .from("notification_recipients")
    .select(`id, users(${USER_COLUMNS})`)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[])
    .map(mapRow)
    .filter((recipient): recipient is NotificationRecipient => recipient !== null);
}

export async function addNotificationRecipient(workspaceId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("notification_recipients")
    .insert({ workspace_id: workspaceId, user_id: userId, enabled: true });
  if (error) throw new Error(error.message);
}

export async function removeNotificationRecipient(workspaceId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("notification_recipients")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}
