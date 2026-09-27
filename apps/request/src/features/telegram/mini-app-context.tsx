import { createContext, useContext, useEffect } from "react"
import type { ReactNode } from "react"
import { useTelegramLaunch } from "./use-telegram-launch"
import { useMiniAppDetail } from "./use-mini-app-detail"

function useMiniAppController() {
  const launch = useTelegramLaunch()
  const detail = useMiniAppDetail({ target: launch.state.target, initData: launch.state.initData })
  const { reload } = detail.actions

  useEffect(() => {
    void reload()
  }, [reload])

  return {
    state: {
      launchStatus: launch.state.status,
      colorScheme: launch.state.colorScheme,
      target: launch.state.target,
      initData: launch.state.initData,
      detailPhase: detail.state.phase,
      detail: detail.state.detail,
      viewer: detail.state.viewer,
      errorCode: detail.state.errorCode,
      errorMessage: detail.state.errorMessage,
      actionPending: detail.state.actionPending,
    },
    actions: {
      runAction: detail.actions.runAction,
      reload: detail.actions.reload,
      applyResponse: detail.actions.applyResponse,
      setDetail: detail.actions.setDetail,
    },
    meta: {
      webApp: launch.meta.webApp,
    },
  }
}

type MiniAppContextValue = ReturnType<typeof useMiniAppController>

const MiniAppContext = createContext<MiniAppContextValue | null>(null)

export function MiniAppProvider({ children }: { children: ReactNode }) {
  const value = useMiniAppController()
  return <MiniAppContext.Provider value={value}>{children}</MiniAppContext.Provider>
}

export function useMiniAppContext(): MiniAppContextValue {
  const context = useContext(MiniAppContext)
  if (!context) {
    throw new Error("useMiniAppContext must be used within MiniAppProvider")
  }
  return context
}
