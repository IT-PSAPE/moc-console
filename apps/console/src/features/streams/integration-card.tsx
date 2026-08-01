import { Button } from "@moc/ui/components/controls/button"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { Badge } from "@moc/ui/components/display/badge"
import { Card } from "@moc/ui/components/display/card"
import { LoadingSpinner } from "@moc/ui/components/feedback/spinner"
import { Link2, RefreshCw, Unlink } from "lucide-react"
import type { ReactNode } from "react"

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
  if (isLoading) {
    return <Card.Content><LoadingSpinner className="py-6" /></Card.Content>
  }

  return (
    <Card.Content className="flex flex-col items-stretch justify-between gap-4 p-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <div className="size-10 shrink-0 rounded-lg bg-secondary flex items-center justify-center overflow-hidden border border-secondary ring-2 ring-border-secondary/40">
          {icon}
        </div>
        <div className="flex flex-col gap-0.5">
          <Label.sm>{isConnected ? accountLabel ?? name : name}</Label.sm>
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
        </div>
      </div>

      {canManage && (
        isConnected ? (
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center [&_button]:w-full sm:[&_button]:w-auto">
            {needsReauth && (
              <Button
                variant="primary"
                onClick={onConnect}
                icon={<RefreshCw className="size-4" />}
              >
                Reconnect
              </Button>
            )}
            <Button
              variant="danger-secondary"
              onClick={onDisconnect}
              disabled={isDisconnecting}
              icon={<Unlink className="size-4" />}
            >
              {isDisconnecting ? "Disconnecting…" : "Disconnect"}
            </Button>
          </div>
        ) : (
          <Button
            variant="primary"
            onClick={onConnect}
            icon={<Link2 className="size-4" />}
            className="w-full sm:w-auto"
          >
            Connect
          </Button>
        )
      )}

      {!canManage && !isConnected && (
        <Paragraph.xs className="text-quaternary shrink-0">Admin required</Paragraph.xs>
      )}
    </Card.Content>
  )
}
