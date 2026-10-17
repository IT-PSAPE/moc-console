import { Button } from "@moc/ui/components/controls/button"
import { Paragraph } from "@moc/ui/components/display/text"
import { Badge } from "@moc/ui/components/display/badge"
import { ListItemCard } from "@moc/ui/components/display/list-item-card"
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner"
import { ConfirmationDialog } from "@moc/ui/components/overlays/confirmation-dialog"
import { Link2, RefreshCw, Unlink } from "lucide-react"
import { useState, type ReactNode } from "react"

type IntegrationCardProps = {
  icon: ReactNode
  name: string
  isLoading: boolean
  isConnected: boolean
  accountLabel: string | null
  canManage: boolean
  onConnect: () => void
  onDisconnect: () => void
  isDisconnecting: boolean
  // Connected but the stored authorization is dead — surface a
  // Reconnect affordance instead of a healthy "Connected" state.
  needsReauth?: boolean
}

export function IntegrationCard({ icon, name, isLoading, isConnected, accountLabel, canManage, onConnect, onDisconnect, isDisconnecting, needsReauth = false }: IntegrationCardProps) {
  // Disconnecting revokes the provider authorization immediately, so the
  // button only opens a confirmation; the dialog's confirm performs it.
  const [confirmOpen, setConfirmOpen] = useState(false)

  function openDisconnectConfirm() {
    setConfirmOpen(true)
  }

  function handleConfirmDisconnect() {
    setConfirmOpen(false)
    onDisconnect()
  }

  if (isLoading) {
    return <ListItemCard.Root><LoadingSpinner className="py-6" /></ListItemCard.Root>
  }

  return (
    <ListItemCard.Root className="portrait:flex-col portrait:items-stretch">
      <ListItemCard.Leading className="size-10 rounded-lg border border-secondary bg-primary">
        {icon}
      </ListItemCard.Leading>
      <ListItemCard.Content>
        <ListItemCard.Title>{isConnected ? accountLabel ?? name : name}</ListItemCard.Title>
        <div className="flex items-center gap-1.5">
          {isConnected ? (
            needsReauth ? (
              <>
                <Badge label="Reconnect required" color="red" />
                <Paragraph.xs className="text-quaternary">Authorization expired</Paragraph.xs>
              </>
            ) : (
              <Badge label="Connected" color="green" />
            )
          ) : (
            <Badge label="Not connected" color="gray" />
          )}
        </div>
      </ListItemCard.Content>

      <ListItemCard.Trailing>
        {canManage && (
          isConnected ? (
            <>
              {needsReauth && (
                <Button variant="secondary" onClick={onConnect} icon={<RefreshCw />}>
                  Reconnect
                </Button>
              )}
              <Button variant="danger-secondary" onClick={openDisconnectConfirm} disabled={isDisconnecting} icon={<Unlink />}>
                {isDisconnecting ? "Disconnecting…" : "Disconnect"}
              </Button>
              <ConfirmationDialog
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title={`Disconnect ${name}?`}
                description={`${accountLabel ?? name} will be disconnected from this workspace. Streams and meetings that depend on it stop syncing until it is connected again.`}
                confirmLabel="Disconnect"
                isConfirming={isDisconnecting}
                onConfirm={handleConfirmDisconnect}
              />
            </>
          ) : (
            <Button variant="secondary" onClick={onConnect} icon={<Link2 />}>
              Connect
            </Button>
          )
        )}

        {!canManage && !isConnected && (
          <Paragraph.xs className="text-quaternary">Admin required</Paragraph.xs>
        )}
      </ListItemCard.Trailing>
    </ListItemCard.Root>
  )
}
