import { Button } from "@moc/ui/components/controls/button"
import { ListItemCard } from "@moc/ui/components/display/list-item-card"
import { Mail } from "lucide-react"

type InvitationRowProps = {
  email: string
  formattedExpiry: string
  busyAction: "resend" | "revoke" | null
  disabled: boolean
  onResend: () => void
  onRevoke: () => void
}

export function InvitationRow({ email, formattedExpiry, busyAction, disabled, onResend, onRevoke }: InvitationRowProps) {
  return (
    <ListItemCard.Root>
      <ListItemCard.Leading><Mail aria-hidden="true" /></ListItemCard.Leading>
      <ListItemCard.Content>
        <ListItemCard.Title>{email}</ListItemCard.Title>
        <ListItemCard.Subtitle>{formattedExpiry}</ListItemCard.Subtitle>
      </ListItemCard.Content>
      <ListItemCard.Trailing>
        <Button size="sm" variant="secondary" disabled={disabled} onClick={onResend}>
          {busyAction === "resend" ? "Resending…" : "Resend"}
        </Button>
        <Button size="sm" variant="danger-secondary" disabled={disabled} onClick={onRevoke}>
          {busyAction === "revoke" ? "Revoking…" : "Revoke"}
        </Button>
      </ListItemCard.Trailing>
    </ListItemCard.Root>
  )
}
