import { useEffect, useState } from "react"
import { getTelegramWebApp, loadTelegramWebApp } from "@/lib/telegram-web-app"
import type { TelegramColorScheme, TelegramWebApp } from "@/lib/telegram-web-app"
import { parseMiniAppStartParam } from "@moc/notifications"
import type { MiniAppTarget } from "@moc/notifications"

export type TelegramLaunchStatus = "loading" | "ready" | "unavailable"

function applyColorScheme(colorScheme: TelegramColorScheme) {
  document.documentElement.dataset.theme = colorScheme === "dark" ? "dark" : "light"
}

// Loads the Telegram Web App SDK on mount, exposes its ready state, parsed
// start param and color scheme, and keeps <html data-theme> in sync with
// Telegram's own theme (dark/light) — the @moc/ui token aliases only resolve
// from :root / <html>, never a nested element.
export function useTelegramLaunch() {
  const [status, setStatus] = useState<TelegramLaunchStatus>("loading")
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null)
  const [colorScheme, setColorScheme] = useState<TelegramColorScheme>("light")
  const [target, setTarget] = useState<MiniAppTarget | null>(null)

  useEffect(() => {
    let cancelled = false

    loadTelegramWebApp().then((app) => {
      if (cancelled) {
        return
      }

      if (!app || !app.initData) {
        setStatus("unavailable")
        return
      }

      app.ready()
      app.expand()
      setTarget(parseMiniAppStartParam(app.initDataUnsafe.start_param))
      setWebApp(app)
      setColorScheme(app.colorScheme)
      applyColorScheme(app.colorScheme)
      setStatus("ready")
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!webApp) {
      return
    }

    function handleThemeChanged() {
      const current = getTelegramWebApp()
      if (!current) {
        return
      }
      setColorScheme(current.colorScheme)
      applyColorScheme(current.colorScheme)
    }

    webApp.onEvent("themeChanged", handleThemeChanged)
    return () => webApp.offEvent("themeChanged", handleThemeChanged)
  }, [webApp])

  return {
    state: {
      status,
      colorScheme,
      initData: webApp?.initData ?? "",
      target,
    },
    actions: {},
    meta: {
      webApp,
    },
  }
}
