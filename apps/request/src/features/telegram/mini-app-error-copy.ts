import type { MiniAppErrorCode } from "@moc/notifications"

// Human copy for each MiniAppErrorCode. `invalid` has no fixed copy — the
// server's own message (a network problem, a malformed request) is shown
// as-is instead.
export const MINI_APP_ERROR_COPY: Record<Exclude<MiniAppErrorCode, "invalid">, { title: string; description: string }> = {
  unauthorized: {
    title: "Session not verified",
    description: "Your Telegram session couldn't be verified. Close this and reopen it from Telegram.",
  },
  not_linked: {
    title: "Telegram not linked",
    description: "Your Telegram account isn't linked yet. Open MOC Console, go to your account settings, and link Telegram there — then reopen this.",
  },
  forbidden: {
    title: "No access",
    description: "You don't have permission to view this.",
  },
  not_found: {
    title: "Not found",
    description: "This item couldn't be found. It may have been deleted.",
  },
  invalid_transition: {
    title: "Already moved on",
    description: "This item's status has already changed. Reload to see where it stands now.",
  },
}
