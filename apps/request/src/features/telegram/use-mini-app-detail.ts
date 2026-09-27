import { useCallback, useState } from "react"
import { postTelegramMiniApp } from "@/data/telegram-mini-app"
import type {
  MiniAppDetail,
  MiniAppErrorCode,
  MiniAppResponse,
  MiniAppTarget,
  MiniAppViewer,
  TelegramAction,
  TelegramActionEntityType,
} from "@moc/notifications"

export type MiniAppDetailPhase = "idle" | "loading" | "ready" | "error"

type UseMiniAppDetailOptions = {
  target: MiniAppTarget | null
  initData: string
}

// Owns the Mini App's view/action round trips: loads the current entity or
// checklist, applies every response (view, action, and — via applyResponse —
// checklist/scan responses from sibling hooks) to the same state.
export function useMiniAppDetail({ target, initData }: UseMiniAppDetailOptions) {
  const [phase, setPhase] = useState<MiniAppDetailPhase>("idle")
  const [detail, setDetail] = useState<MiniAppDetail | null>(null)
  const [viewer, setViewer] = useState<MiniAppViewer | null>(null)
  const [errorCode, setErrorCode] = useState<MiniAppErrorCode | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [actionPending, setActionPending] = useState(false)

  const applyResponse = useCallback((response: MiniAppResponse) => {
    if (response.ok) {
      setViewer(response.viewer)
      setDetail(response.detail)
      setErrorCode(null)
      setErrorMessage(null)
      setPhase("ready")
    } else {
      setErrorCode(response.error)
      setErrorMessage(response.message)
      setPhase("error")
    }
  }, [])

  const load = useCallback(async () => {
    if (!target || !initData) {
      return
    }

    setPhase("loading")
    const response = await postTelegramMiniApp({ op: "view", initData, target })
    applyResponse(response)
  }, [applyResponse, initData, target])

  // The initial (and any target-change) load is triggered by the consumer
  // (MiniAppProvider) so this hook's own setState calls aren't invoked from
  // an effect defined in this same file.
  const runAction = useCallback(async (entityType: TelegramActionEntityType, entityId: string, action: TelegramAction) => {
    if (!initData || actionPending) {
      return
    }

    setActionPending(true)
    const response = await postTelegramMiniApp({ op: "action", initData, entityType, entityId, action })
    setActionPending(false)
    applyResponse(response)
  }, [actionPending, applyResponse, initData])

  return {
    state: { phase, detail, viewer, errorCode, errorMessage, actionPending },
    actions: { reload: load, runAction, applyResponse, setDetail },
    meta: { target, initData },
  }
}
