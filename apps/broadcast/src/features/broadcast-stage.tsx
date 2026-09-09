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
      className={cn("grid h-dvh w-full grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(16rem,1fr)] overflow-y-auto bg-primary text-primary lg:grid-cols-[minmax(0,1fr)_21rem] lg:grid-rows-1 lg:overflow-hidden", className)}
      {...props}
    >
      {children}
    </section>
  )
}

/**
 * Mobile keeps the player at its natural height so the controls remain reachable.
 * Desktop sizes the grouped cover and controls against the available column height.
 */
export function BroadcastMain({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 min-w-0 items-center justify-center pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-6 pl-[max(1rem,env(safe-area-inset-left))] lg:[container-type:size] lg:px-8 lg:pb-4">
      <div className="flex w-full min-w-0 max-w-104 flex-col gap-5 lg:w-[min(26rem,max(12rem,100cqh_-_16rem))] lg:max-h-full lg:overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

export function BroadcastScreen({ children }: { children: ReactNode }) {
  return <div className="flex min-w-0 justify-center">{children}</div>
}
