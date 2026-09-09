import { Clock3 } from "lucide-react"
import { Button } from "@moc/ui/components/controls/button"
import { Paragraph } from "@moc/ui/components/display/text"
import { AuthLayout } from "./auth-layout"

type PendingAccessScreenProps = {
  checking: boolean
  onCheckAgain: () => void
  onSignOut: () => void
}

export function PendingAccessScreen({ checking, onCheckAgain, onSignOut }: PendingAccessScreenProps) {
  return (
    <AuthLayout>
      <div className="space-y-5 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand_secondary text-brand">
          <Clock3 className="size-6" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h1 className="title-h6">Access awaiting approval</h1>
          <Paragraph.sm className="text-tertiary">Your account is ready. A workspace administrator needs to approve your request before you can open the console.</Paragraph.sm>
        </div>
        <div className="space-y-2">
          <Button className="w-full" disabled={checking} onClick={onCheckAgain}>{checking ? "Checking…" : "Check again"}</Button>
          <Button className="w-full" variant="secondary" onClick={onSignOut}>Sign out</Button>
        </div>
      </div>
    </AuthLayout>
  )
}
