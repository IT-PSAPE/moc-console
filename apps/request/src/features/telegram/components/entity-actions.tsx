import { useState } from "react"
import { ConfirmationDialog } from "@moc/ui/components/overlays/confirmation-dialog"
import { PublicFlow } from "@/features/components/public-flow"
import { EntityActionButton } from "./entity-action-button"
import type { MiniAppAction, TelegramAction, TelegramActionEntityType } from "@moc/notifications"

const DESTRUCTIVE_ACTIONS: ReadonlySet<TelegramAction> = new Set(["reject"])

type EntityActionsProps = {
  entityType: TelegramActionEntityType
  entityId: string
  actions: MiniAppAction[]
  actionPending: boolean
  onRunAction: (entityType: TelegramActionEntityType, entityId: string, action: TelegramAction) => void
}

export function EntityActions({ entityType, entityId, actions, actionPending, onRunAction }: EntityActionsProps) {
  const [confirmAction, setConfirmAction] = useState<MiniAppAction | null>(null)

  function requestAction(action: MiniAppAction) {
    if (DESTRUCTIVE_ACTIONS.has(action.action)) {
      setConfirmAction(action)
      return
    }
    onRunAction(entityType, entityId, action.action)
  }

  function handleConfirmOpenChange(open: boolean) {
    if (!open) {
      setConfirmAction(null)
    }
  }

  function handleConfirm() {
    if (!confirmAction) {
      return
    }
    onRunAction(entityType, entityId, confirmAction.action)
    setConfirmAction(null)
  }

  function renderAction(action: MiniAppAction) {
    return <EntityActionButton key={action.action} action={action} disabled={actionPending} onRequest={requestAction} />
  }

  if (actions.length === 0) {
    return null
  }

  return (
    <>
      <PublicFlow.Actions className="mt-0">
        {actions.map(renderAction)}
      </PublicFlow.Actions>

      <ConfirmationDialog
        open={confirmAction !== null}
        onOpenChange={handleConfirmOpenChange}
        title={`${confirmAction?.label ?? "Confirm"}?`}
        description="This can't be undone from here."
        confirmLabel={confirmAction?.label ?? "Confirm"}
        isConfirming={actionPending}
        onConfirm={handleConfirm}
      />
    </>
  )
}
