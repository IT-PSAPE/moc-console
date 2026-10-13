import { Clock3 } from "lucide-react"
import { Button } from "@moc/ui/components/controls/button"
import { Paragraph } from "@moc/ui/components/display/text"
import { AuthLayout } from "./auth-layout"

type PendingAccessScreenProps = {
  checking: boolean
  error: Error | null
  onCheckAgain: () => void
  onSignOut: () => void
}

export function PendingAccessScreen({ checking, error, onCheckAgain, onSignOut }: PendingAccessScreenProps) {
  const title = error ? "We couldn't check your workspace access" : "Access awaiting approval"
  const description = error ? error.message : "Your account is ready. A workspace administrator needs to approve your request before you can open the console."

  return (
    <AuthLayout>
      <div className="space-y-5 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand text-brand">
          <Clock3 className="size-6" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h1 className="title-h6">{title}</h1>
          <Paragraph.sm className="text-tertiary">{description}</Paragraph.sm>
        </div>
        <div className="space-y-2">
          <Button className="w-full" disabled={checking} onClick={onCheckAgain}>{checking ? "Checking…" : error ? "Try again" : "Check again"}</Button>
          <Button className="w-full" variant="secondary" onClick={onSignOut}>Sign out</Button>
        </div>
      </div>
    </AuthLayout>
  )
}
