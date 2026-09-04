import type { HTMLAttributes, ReactNode } from "react"
import { cn } from "@moc/utils/cn"
import { useBroadcastPlaybackContext } from "./broadcast-playback-provider"

/**
 * The whole app runs on the dark end of the design tokens — `data-theme` is set
 * on the document root in index.html, because the token aliases resolve there.
 * Every part below therefore uses the same `bg-primary` / `text-tertiary` names
 * as the rest of the platform.
 */
export function BroadcastStage({ children, className, ...props }: HTMLAttributes<HTMLElement>) {
  const { actions, meta } = useBroadcastPlaybackContext()
  const { setPlayerRoot } = actions
  const { broadcast } = meta

  return (
    <section
      ref={setPlayerRoot}
      aria-label={`${broadcast.title} player`}
      className={cn("grid h-dvh w-full grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto] overflow-hidden bg-primary text-primary lg:grid-cols-[minmax(0,1fr)_20rem] lg:grid-rows-1", className)}
      {...props}
    >
      {children}
    </section>
  )
}

export function BroadcastMain({ children }: { children: ReactNode }) {
  return <div className="grid min-h-0 min-w-0 grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto]">{children}</div>
}

export function BroadcastScreen({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 items-center justify-center overflow-hidden px-4 py-6 sm:px-6">
      {children}
    </div>
  )
}
