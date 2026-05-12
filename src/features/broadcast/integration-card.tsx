import { Button } from "@/components/controls/button"
import { Label, Paragraph } from "@/components/display/text"
import { Badge } from "@/components/display/badge"
import { LoadingSpinner, Spinner } from "@/components/feedback/spinner"
import { Link2, Unlink } from "lucide-react"
import type { ReactNode } from "react"

type IntegrationCardProps = {
  icon: ReactNode
  name: string
  description: string
  isLoading: boolean
  isConnected: boolean
  accountLabel: string | null
  canManage: boolean
  onConnect: () => void
  onDisconnect: () => void
  isDisconnecting: boolean
}

export function IntegrationCard({ icon, name, description, isLoading, isConnected, accountLabel, canManage, onConnect, onDisconnect, isDisconnecting }: IntegrationCardProps) {
  if (isLoading) {
    return (
      <LoadingSpinner className="py-6 border border-tertiary rounded-lg" />
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 p-4 border border-tertiary rounded-lg">
      <div className="flex items-center gap-3">
        <div className="size-10 shrink-0 rounded-lg bg-secondary flex items-center justify-center overflow-hidden border border-secondary ring-2 ring-border-secondary/40">
          {icon}
        </div>
        <div className="flex flex-col gap-0.5">
          <Label.sm>{isConnected ? accountLabel ?? name : name}</Label.sm>
          <div className="flex items-center gap-1.5">
            {isConnected ? (
              <Badge label="Connected" color="green" />
            ) : (
              <>
                <Badge label="Not connected" color="gray" />
                <Paragraph.xs className="text-quaternary">{description}</Paragraph.xs>
              </>
            )}
          </div>
        </div>
      </div>

      {canManage && (
        isConnected ? (
          <Button
            variant="danger-secondary"
            onClick={onDisconnect}
            disabled={isDisconnecting}
            icon={<Unlink className="size-4" />}
          >
            {isDisconnecting ? "Disconnecting..." : "Disconnect"}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={onConnect}
            icon={<Link2 className="size-4" />}
          >
            Connect
          </Button>
        )
      )}

      {!canManage && !isConnected && (
        <Paragraph.xs className="text-quaternary shrink-0">Admin required</Paragraph.xs>
      )}
    </div>
  )
}
