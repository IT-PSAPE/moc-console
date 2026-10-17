import { Paragraph } from "./text"
import type { ReactNode } from "react"

// Two-column label/value row for detail pages: a fixed-width label column
// (icon + caption) on the left, the value — plain text or a `style="ghost"`
// control — filling the remainder.
export function MetaRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)] items-center gap-3 min-h-control [&_[data-ui-control]]:min-h-control-sm">
      <div className="flex min-w-0 items-center gap-2 text-tertiary">
        <span className="*:size-4 shrink-0">{icon}</span>
        <Paragraph.xs className="w-full truncate text-tertiary">{label}</Paragraph.xs>
      </div>
      <div className="min-w-0 break-words paragraph-sm text-primary">{children}</div>
    </div>
  )
}
