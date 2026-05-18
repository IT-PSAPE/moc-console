import { supabase } from "@moc/data/supabase";
import type { MessageType, TemplateScope } from "./notification-templates-core";

export type NotificationTemplate = {
  id: string;
  workspaceId: string;
  scope: TemplateScope;
  messageType: MessageType;
  body: string;
  createdAt: string;
  updatedAt: string;
};

type Row = {
  id: string;
  workspace_id: string;
  scope: string;
  message_type: string;
  body: string;
  created_at: string;
  updated_at: string;
};

function rowToTemplate(row: Row): NotificationTemplate {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    scope: row.scope as TemplateScope,
    messageType: row.message_type as MessageType,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const COLUMNS = "id, workspace_id, scope, message_type, body, created_at, updated_at";

export async function fetchNotificationTemplates(
  workspaceId: string,
): Promise<NotificationTemplate[]> {
  const { data, error } = await supabase
    .from("notification_message_templates")
    .select(COLUMNS)
    .eq("workspace_id", workspaceId);

  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map(rowToTemplate);
}

export async function upsertNotificationTemplate(params: {
  workspaceId: string;
  scope: TemplateScope;
  messageType: MessageType;
  body: string;
}): Promise<NotificationTemplate> {
  const { data, error } = await supabase
    .from("notification_message_templates")
    .upsert(
      {
        workspace_id: params.workspaceId,
        scope: params.scope,
        message_type: params.messageType,
        body: params.body,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,scope,message_type" },
    )
    .select(COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return rowToTemplate(data as Row);
}

// "Restore default" — removing the row makes the renderer fall back to
// DEFAULT_TEMPLATES. No-op if no custom row exists.
export async function deleteNotificationTemplate(params: {
  workspaceId: string;
  scope: TemplateScope;
  messageType: MessageType;
}): Promise<void> {
  const { error } = await supabase
    .from("notification_message_templates")
    .delete()
    .eq("workspace_id", params.workspaceId)
    .eq("scope", params.scope)
    .eq("message_type", params.messageType);

  if (error) throw new Error(error.message);
}
