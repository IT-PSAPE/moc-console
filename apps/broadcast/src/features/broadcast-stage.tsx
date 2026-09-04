import type { HTMLAttributes, ReactNode } from "react"
import { cn } from "@moc/utils/cn"
import { useBroadcastPlaybackContext } from "./broadcast-playback-provider"

/**
 * The whole app runs on the dark end of the design tokens — `data-theme` is set
 * on the document root in index.html, because the token aliases resolve there.
 * The player deliberately does without the console's borders and dividers:
 * separation here comes from spacing and the surface fills alone.
 */
export function BroadcastStage({ children, className, ...props }: HTMLAttributes<HTMLElement>) {
  const { actions, meta } = useBroadcastPlaybackContext()
  const { setPlayerRoot } = actions
  const { broadcast } = meta

  return (
    <section
      ref={setPlayerRoot}
      aria-label={`${broadcast.title} player`}
      className={cn("grid h-dvh w-full grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto] overflow-hidden bg-primary text-primary lg:grid-cols-[minmax(0,1fr)_21rem] lg:grid-rows-1", className)}
      {...props}
    >
      {children}
    </section>
  )
}

/**
 * Cover and controls are one column of the same width, sized from whichever of
 * the column's two dimensions runs out first, so they stay grouped instead of
 * drifting apart as the viewport grows.
 */
export function BroadcastMain({ children }: { children: ReactNode }) {
  return (
    <div className="@container flex min-h-0 min-w-0 items-center justify-center px-4 py-[max(1rem,env(safe-area-inset-top))] lg:px-8">
      <div className="flex w-[min(26rem,100cqh_-_13rem)] min-w-0 flex-col gap-5">
        {children}
      </div>
    </div>
  )
}

export function BroadcastScreen({ children }: { children: ReactNode }) {
  return <div className="flex min-w-0 justify-center">{children}</div>
}
