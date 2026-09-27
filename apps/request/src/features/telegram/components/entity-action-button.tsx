import { Button } from "@moc/ui/components/controls/button"
import type { MiniAppAction } from "@moc/notifications"

type EntityActionButtonProps = {
  action: MiniAppAction
  disabled: boolean
  onRequest: (action: MiniAppAction) => void
}

export function EntityActionButton({ action, disabled, onRequest }: EntityActionButtonProps) {
  function handleClick() {
    onRequest(action)
  }

  return (
    <Button variant={action.style} disabled={disabled} onClick={handleClick}>
      {action.label}
    </Button>
  )
}
