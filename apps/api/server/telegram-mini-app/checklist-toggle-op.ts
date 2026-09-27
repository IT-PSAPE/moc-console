// The "checklist.toggle" op: a member may toggle any item when they hold
// can_update; anyone assigned to the specific item may toggle it too.

import type { MiniAppResponse } from "@moc/notifications"
import { loadChecklist, setChecklistItemChecked } from "./store/checklist-store.js"
import { findViewerByTelegramId, loadWorkspacePermissions } from "./store/viewer-store.js"
import { buildChecklistDetail } from "./view-builders.js"

export async function handleChecklistToggle(
  telegramUserId: string,
  checklistId: string,
  itemId: string,
  checked: boolean,
): Promise<MiniAppResponse> {
  const linked = await findViewerByTelegramId(telegramUserId)
  if (!linked) return { ok: false, error: "not_linked", message: "Link your Telegram account in MOC Console first." }

  const checklist = await loadChecklist(checklistId)
  if (!checklist) return { ok: false, error: "not_found", message: "That checklist could not be found." }

  const item = checklist.items.find((candidate) => candidate.id === itemId)
  if (!item) return { ok: false, error: "not_found", message: "That checklist item could not be found." }

  const permissions = await loadWorkspacePermissions(checklist.workspaceId, linked.userId)
  if (!permissions || !permissions.canRead) return { ok: false, error: "forbidden", message: "You don't have access to this workspace." }

  if (!permissions.canUpdate) return { ok: false, error: "forbidden", message: "You don't have permission to check off items." }

  await setChecklistItemChecked(itemId, checked)

  const refreshed = await loadChecklist(checklistId)
  if (!refreshed) return { ok: false, error: "not_found", message: "That checklist could not be found." }

  return {
    ok: true,
    viewer: { userId: linked.userId, name: linked.name, canUpdate: permissions.canUpdate },
    detail: buildChecklistDetail(refreshed, permissions.canUpdate),
  }
}
