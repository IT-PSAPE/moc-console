import { moc } from "@/lib/moc-client"

function postAssignment(operation: () => Promise<unknown>): void {
  void operation().catch(() => undefined)
}

export function notifyRequestAssignment(requestId: string, userId: string, duty: string): void {
  postAssignment(() => moc.notifications.requestAssignment(requestId, userId, duty))
}

export function notifyChecklistItemAssignment(checklistItemId: string, userId: string): void {
  postAssignment(() => moc.notifications.checklistItemAssignment(checklistItemId, userId))
}
