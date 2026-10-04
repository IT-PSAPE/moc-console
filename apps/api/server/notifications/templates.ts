import { queryRows } from "@moc/backend/database";
import type { QueryResultRow } from "pg";
import {
  DEFAULT_TEMPLATES,
  type MessageType,
  type TemplateScope,
} from "@moc/notifications";

// Returns the workspace's custom template body for this message type,
// or the hardcoded default when none is set. Any lookup failure falls
// back to the default so a DB hiccup never silences notifications.
export async function resolveTemplate(
  workspaceId: string,
  scope: TemplateScope,
  messageType: MessageType,
): Promise<string> {
  const fallback = DEFAULT_TEMPLATES[messageType];
  try {
    const [data] = await queryRows<QueryResultRow & { body: string | null }>(
      `SELECT body FROM public.notification_message_templates
       WHERE workspace_id = $1 AND scope = $2 AND message_type = $3
       LIMIT 1`,
      [workspaceId, scope, messageType],
    );

    if (!data?.body) return fallback;
    return data.body;
  } catch {
    return fallback;
  }
}
