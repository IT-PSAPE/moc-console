// Minimal typed surface of window.Telegram.WebApp — only the parts the Mini
// App uses. The real SDK exposes much more; we deliberately don't type or use
// the rest so this stays a thin, honest contract.

export type TelegramColorScheme = "light" | "dark"

export type TelegramThemeParams = {
  bg_color?: string
  text_color?: string
  hint_color?: string
  link_color?: string
  button_color?: string
  button_text_color?: string
  secondary_bg_color?: string
}

export type TelegramHapticFeedback = {
  impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void
  notificationOccurred: (type: "error" | "success" | "warning") => void
  selectionChanged: () => void
}

export type TelegramBackButton = {
  show: () => void
  hide: () => void
  onClick: (callback: () => void) => void
  offClick: (callback: () => void) => void
}

export type TelegramScanQrPopupParams = { text?: string }

export type TelegramThemeChangedEvent = "themeChanged"

export type TelegramWebApp = {
  initData: string
  initDataUnsafe: { start_param?: string }
  colorScheme: TelegramColorScheme
  themeParams: TelegramThemeParams
  HapticFeedback: TelegramHapticFeedback
  BackButton: TelegramBackButton
  ready: () => void
  expand: () => void
  close: () => void
  onEvent: (eventType: TelegramThemeChangedEvent, callback: () => void) => void
  offEvent: (eventType: TelegramThemeChangedEvent, callback: () => void) => void
  showScanQrPopup: (params: TelegramScanQrPopupParams, callback: (scannedText: string) => boolean | void) => void
  closeScanQrPopup: () => void
  showAlert: (message: string, callback?: () => void) => void
}

type TelegramWindow = Window & { Telegram?: { WebApp: TelegramWebApp } }

const SCRIPT_SRC = "https://telegram.org/js/telegram-web-app.js"

let loadPromise: Promise<TelegramWebApp | null> | null = null

function getWindow(): TelegramWindow {
  return window as TelegramWindow
}

/** Synchronous getter — only returns a value once the script has loaded. */
export function getTelegramWebApp(): TelegramWebApp | null {
  return getWindow().Telegram?.WebApp ?? null
}

/**
 * Injects the Telegram Web App script once and resolves with the SDK once
 * it's available. Resolves `null` (never rejects) when the script fails to
 * load or the page isn't running inside Telegram, so callers can show a
 * friendly "open this from Telegram" state instead of an error.
 */
export function loadTelegramWebApp(): Promise<TelegramWebApp | null> {
  if (loadPromise) {
    return loadPromise
  }

  const existing = getTelegramWebApp()
  if (existing) {
    loadPromise = Promise.resolve(existing)
    return loadPromise
  }

  loadPromise = new Promise((resolve) => {
    const script = document.createElement("script")
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => resolve(getTelegramWebApp())
    script.onerror = () => resolve(null)
    document.head.appendChild(script)
  })

  return loadPromise
}
