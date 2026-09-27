import { useMiniAppContext } from "./mini-app-context"
import type { MiniAppChecklistDetail, MiniAppEntityDetail, MiniAppErrorCode } from "@moc/notifications"

export type MiniAppView =
  | { kind: "unavailable" }
  | { kind: "no_target" }
  | { kind: "loading" }
  | { kind: "error"; code: MiniAppErrorCode; message: string }
  | { kind: "checklist"; detail: MiniAppChecklistDetail }
  | { kind: "entity"; detail: MiniAppEntityDetail; autoStartScan: boolean }
  | { kind: "empty" }

// Picks the one screen the Mini App should show, in priority order, so the
// screen component only switches on a single discriminant.
export function useMiniAppView(): MiniAppView {
  const { state } = useMiniAppContext()

  if (state.launchStatus === "unavailable") return { kind: "unavailable" }
  if (state.launchStatus === "ready" && !state.target) return { kind: "no_target" }
  if (state.launchStatus === "loading" || state.detailPhase === "idle" || state.detailPhase === "loading") return { kind: "loading" }
  if (state.detailPhase === "error" && state.errorCode) {
    return { kind: "error", code: state.errorCode, message: state.errorMessage ?? "Something went wrong." }
  }
  if (!state.detail) return { kind: "empty" }
  if (state.detail.kind === "checklist") return { kind: "checklist", detail: state.detail }
  return { kind: "entity", detail: state.detail, autoStartScan: state.target?.kind === "scan" }
}
