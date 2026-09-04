import { Page } from "@moc/ui/components/layout/page"
import { SkipLink } from "@moc/ui/components/navigation/skip-link"
import type { ReactNode } from "react"

/** Shell for every state the player itself is not driving: loading, missing, empty, failed. */
export function BroadcastLayout({ children }: { children: ReactNode }) {
  return (
    <Page className="flex min-h-dvh flex-col bg-primary">
      <SkipLink />
      <Page.Content id="main-content" tabIndex={-1} width="readable" className="flex flex-1 flex-col justify-center outline-none">
        {children}
      </Page.Content>
    </Page>
  )
}
