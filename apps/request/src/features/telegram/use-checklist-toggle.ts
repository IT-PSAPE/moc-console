import { useCallback, useState } from "react"
import { postTelegramMiniApp } from "@/data/telegram-mini-app"
import type { MiniAppChecklistDetail, MiniAppDetail } from "@moc/notifications"

type UseChecklistToggleOptions = {
  initData: string
  detail: MiniAppChecklistDetail
  setDetail: (detail: MiniAppDetail) => void
}

function withToggledItem(detail: MiniAppChecklistDetail, itemId: string, checked: boolean): MiniAppChecklistDetail {
  return {
    ...detail,
    sections: detail.sections.map((section) => ({
      ...section,
      items: section.items.map((item) => (item.id === itemId ? { ...item, checked } : item)),
    })),
  }
}

// Optimistic checklist item toggle: flips the item immediately, then rolls
// back to the pre-toggle detail if the server disagrees.
export function useChecklistToggle({ initData, detail, setDetail }: UseChecklistToggleOptions) {
  const [pendingItemIds, setPendingItemIds] = useState<ReadonlySet<string>>(new Set())
  const [lastError, setLastError] = useState<string | null>(null)

  const toggle = useCallback(async (itemId: string, checked: boolean) => {
    if (pendingItemIds.has(itemId)) {
      return
    }

    const previousDetail = detail
    setLastError(null)
    setDetail(withToggledItem(detail, itemId, checked))
    setPendingItemIds((current) => new Set(current).add(itemId))

    const response = await postTelegramMiniApp({ op: "checklist.toggle", initData, checklistId: detail.id, itemId, checked })

    setPendingItemIds((current) => {
      const next = new Set(current)
      next.delete(itemId)
      return next
    })

    if (response.ok) {
      setDetail(response.detail)
    } else {
      setDetail(previousDetail)
      setLastError(response.message)
    }
  }, [detail, initData, pendingItemIds, setDetail])

  return {
    state: { pendingItemIds, lastError },
    actions: { toggle },
    meta: {},
  }
}
