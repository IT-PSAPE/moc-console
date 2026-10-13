import { Page } from "@moc/ui/components/layout/page"
import { SkipLink } from "@moc/ui/components/navigation/skip-link"
import type { ReactNode } from "react"

/** Shell for every state the player itself is not driving: loading, missing, empty, failed. */
export function BroadcastLayout({ children }: { children: ReactNode }) {
  return (
    <Page className="flex min-h-dvh flex-col bg-primary">
      <SkipLink />
      <Page.Main id="main-content" tabIndex={-1} width="readable" className="mx-auto flex w-full flex-1 flex-col justify-center pb-[max(1.5rem,env(safe-area-inset-bottom))] pr-[max(var(--spacing-page-gutter),env(safe-area-inset-right))] pl-[max(var(--spacing-page-gutter),env(safe-area-inset-left))] outline-none">
        {children}
      </Page.Main>
    </Page>
  )
}
