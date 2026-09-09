import { buildSessionHeaders } from "@/lib/api-auth";
import { apiUrl } from "@moc/utils/api-url";

// The API rejects unknown keys, so a checklist-item body must not carry a duty.
type AssignmentBody =
  | { kind: "request"; parentId: string; userId: string; duty: string }
  | { kind: "checklist_item"; parentId: string; userId: string };

// Fire-and-forget: notification failures must never break the assignment UI.
// The server endpoint silently no-ops when the assignee has no Telegram linked.
function postAssignment(body: AssignmentBody): void {
  void (async () => {
    try {
      const headers = await buildSessionHeaders();
      await fetch(apiUrl("/api/notifications/assignment"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify(body),
      });
    } catch {
      // swallow
    }
  })();
}

export function notifyRequestAssignment(requestId: string, userId: string, duty: string): void {
  postAssignment({ kind: "request", parentId: requestId, userId, duty });
}

export function notifyChecklistItemAssignment(checklistItemId: string, userId: string): void {
  postAssignment({ kind: "checklist_item", parentId: checklistItemId, userId });
}
