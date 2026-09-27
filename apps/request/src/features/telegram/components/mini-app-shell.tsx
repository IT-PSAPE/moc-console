import type { ReactNode } from "react"

// Strictly presentational: the Mini App runs inside Telegram's own webview
// chrome, so unlike PublicLayout it carries no header, logo or nav — just a
// safe-area-aware, mobile-first container.
export function MiniAppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-primary text-primary">
      <main className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {children}
      </main>
    </div>
  )
}
