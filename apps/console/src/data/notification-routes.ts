import { supabase } from "@moc/data/supabase";
import type { NotificationEventKey } from "@moc/notifications";

export type NotificationRoute = {
  id: string;
  workspaceId: string;
  eventType: NotificationEventKey;
  groupChatId: string | null;
  threadId: number | null;
  userId: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type Row = {
  id: string;
  workspace_id: string;
  event_type: string;
  group_chat_id: string | null;
  thread_id: number | null;
  user_id: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

const ROUTE_SELECT = "id, workspace_id, event_type, group_chat_id, thread_id, user_id, enabled, created_at, updated_at";

function rowToRoute(row: Row): NotificationRoute {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    eventType: row.event_type as NotificationEventKey,
    groupChatId: row.group_chat_id,
    threadId: row.thread_id,
    userId: row.user_id,
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchNotificationRoutes(workspaceId: string): Promise<NotificationRoute[]> {
  const { data, error } = await supabase
    .from("notification_routes")
    .select(ROUTE_SELECT)
    .eq("workspace_id", workspaceId)
    .order("event_type", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map(rowToRoute);
}

export async function fetchNotificationRoutesForTarget(workspaceId: string, groupChatId: string, threadId: number | null): Promise<NotificationRoute[]> {
  let query = supabase
    .from("notification_routes")
    .select(ROUTE_SELECT)
    .eq("workspace_id", workspaceId)
    .eq("group_chat_id", groupChatId);
  query = threadId === null ? query.is("thread_id", null) : query.eq("thread_id", threadId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map(rowToRoute);
}

export async function fetchNotificationRoutesForUser(workspaceId: string, userId: string): Promise<NotificationRoute[]> {
  const { data, error } = await supabase
    .from("notification_routes")
    .select(ROUTE_SELECT)
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map(rowToRoute);
}

export async function createNotificationRoute(params: {
  workspaceId: string;
  eventType: NotificationEventKey;
  groupChatId: string;
  threadId: number | null;
}): Promise<NotificationRoute> {
  const { data, error } = await supabase
    .from("notification_routes")
    .insert({
      workspace_id: params.workspaceId,
      event_type: params.eventType,
      group_chat_id: params.groupChatId,
      thread_id: params.threadId,
      enabled: true,
    })
    .select(ROUTE_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return rowToRoute(data as Row);
}

export async function createUserNotificationRoute(params: {
  workspaceId: string;
  eventType: NotificationEventKey;
  userId: string;
}): Promise<NotificationRoute> {
  const { data, error } = await supabase
    .from("notification_routes")
    .insert({
      workspace_id: params.workspaceId,
      event_type: params.eventType,
      user_id: params.userId,
      enabled: true,
    })
    .select(ROUTE_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return rowToRoute(data as Row);
}

export async function deleteNotificationRoute(id: string): Promise<void> {
  const { error } = await supabase.from("notification_routes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setNotificationRouteEnabled(id: string, enabled: boolean): Promise<void> {
  const { error } = await supabase.from("notification_routes").update({ enabled }).eq("id", id);
  if (error) throw new Error(error.message);
}
