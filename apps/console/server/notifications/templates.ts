import { getSupabaseAdmin } from "../supabase-admin.js";
import {
  DEFAULT_TEMPLATES,
  type MessageType,
  type TemplateScope,
} from "../../src/data/notification-templates-core.js";

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
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("notification_message_templates")
      .select("body")
      .eq("workspace_id", workspaceId)
      .eq("scope", scope)
      .eq("message_type", messageType)
      .maybeSingle();

    if (error || !data?.body) return fallback;
    return data.body as string;
  } catch {
    return fallback;
  }
}
