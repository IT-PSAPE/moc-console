import { supabase } from "@moc/data/supabase";
import type { NotificationEventKey } from "./notification-events";

export type NotificationRoute = {
  id: string;
  workspaceId: string;
  eventType: NotificationEventKey;
  groupChatId: string;
  threadId: number | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

type Row = {
  id: string;
  workspace_id: string;
  event_type: string;
  group_chat_id: string;
  thread_id: number | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

function rowToRoute(row: Row): NotificationRoute {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    eventType: row.event_type as NotificationEventKey,
    groupChatId: row.group_chat_id,
    threadId: row.thread_id,
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchNotificationRoutes(workspaceId: string): Promise<NotificationRoute[]> {
  const { data, error } = await supabase
    .from("notification_routes")
    .select("id, workspace_id, event_type, group_chat_id, thread_id, enabled, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .order("event_type", { ascending: true })
    .order("created_at", { ascending: true });

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
    .select("id, workspace_id, event_type, group_chat_id, thread_id, enabled, created_at, updated_at")
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
