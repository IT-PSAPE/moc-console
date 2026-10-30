import { scheduledMessageLabel } from "@moc/notifications"
import type { PlatformOperation } from "./context.js"
import { objectInput } from "./input.js"

type ScheduledMessageRow = { id: string; body: string; send_on: string; state: "scheduled" | "sending"; post_role: "primary" | "follow_up" | null }

export const operations: Record<string, PlatformOperation> = {
  scheduledMessages: {
    permission: "can_update",
    async run(context, input) {
      objectInput(input ?? {}, [])
      // Read the same materialized occurrence window as Messages. Preparing or
      // sending deliveries remains the worker/management flow's responsibility.
      // Existing deployments without follow-up posts have no post_role column.
      const result = await context.db.query<ScheduledMessageRow>(
        `SELECT o.id, o.body, o.send_on, o.state, to_jsonb(o)->>'post_role' AS post_role
         FROM public.scheduled_message_occurrences o
         JOIN public.scheduled_message_schedules s ON s.id = o.schedule_id AND s.workspace_id = o.workspace_id
         WHERE o.workspace_id = $1 AND s.enabled AND o.state IN ('scheduled', 'sending') AND o.send_on >= CURRENT_TIMESTAMP
         ORDER BY o.send_on, o.id LIMIT 500`,
        [context.workspaceId],
      )
      return result.rows.map((row) => ({
        id: row.id,
        title: row.post_role === "follow_up" ? `${scheduledMessageLabel(row.body)} · Follow-up` : scheduledMessageLabel(row.body),
        scheduledFor: row.send_on,
        status: row.state,
      }))
    },
  },
}
