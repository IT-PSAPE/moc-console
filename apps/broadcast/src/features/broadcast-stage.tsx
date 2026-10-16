import type { HTMLAttributes, ReactNode } from "react"
import { cn } from "@moc/utils/cn"
import { useBroadcastPlaybackContext } from "./broadcast-playback-provider"
import { Page } from "@moc/ui/components/layout/page"

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
    <Page.Main
      ref={setPlayerRoot}
      aria-label={`${broadcast.title} player`}
      className={cn("grid h-dvh w-full grid-cols-[minmax(0,1fr)_21rem] grid-rows-1 overflow-hidden bg-primary text-primary tablet:block tablet:overflow-y-auto", className)}
      {...props}
    >
      {children}
    </Page.Main>
  )
}

/**
 * Mobile keeps the player at its natural height so the controls remain reachable.
 * Desktop sizes the grouped cover and controls against the available column height.
 */
export function BroadcastMain({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-0 min-w-0 items-center justify-center px-8 pt-[max(1rem,env(safe-area-inset-top))] pb-4 [container-type:size] tablet:pr-[max(1rem,env(safe-area-inset-right))] tablet:pb-6 tablet:pl-[max(1rem,env(safe-area-inset-left))] tablet:[container-type:normal]">
      <div className="flex max-h-full w-[min(26rem,max(12rem,100cqh_-_16rem))] min-w-0 max-w-104 flex-col gap-5 overflow-y-auto tablet:max-h-none tablet:w-full tablet:overflow-visible">
        {children}
      </div>
    </div>
  )
}

export function BroadcastScreen({ children }: { children: ReactNode }) {
  return <div className="flex min-w-0 justify-center">{children}</div>
}
