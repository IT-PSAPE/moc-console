import { buildSessionHeaders } from "@/lib/api-auth";

export type AssignmentKind = "request" | "cue" | "checklist_item";

// Fire-and-forget: notification failures must never break the assignment UI.
// The server endpoint silently no-ops when the assignee has no Telegram linked.
export function notifyAssignment(
  kind: AssignmentKind,
  parentId: string,
  userId: string,
  duty: string,
): void {
  void (async () => {
    try {
      const headers = await buildSessionHeaders();
      await fetch("/api/notifications/assignment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({ kind, parentId, userId, duty }),
      });
    } catch {
      // swallow
    }
  })();
}
