import type { ReactElement } from "react"
import { ArrowUpRight, Unlink } from "lucide-react"
import { Button } from "../controls/button"

type LinkedRecordRowProps = {
  label: string
  render: ReactElement
  onRemove?: () => void
  disabled?: boolean
}

/** Compact link chip for a single linked record — used inside a `MetaRow` value column. */
export function LinkedRecordRow({ label, render, onRemove, disabled }: LinkedRecordRowProps) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Button.Link render={render} variant="ghost" size="sm" icon={<ArrowUpRight />} iconPosition="trailing" className="min-w-0 flex-1 justify-start truncate">{label}</Button.Link>
      {onRemove && <Button.Icon icon={<Unlink />} aria-label={`Unlink ${label}`} variant="ghost" size="sm" onClick={onRemove} disabled={disabled} />}
    </div>
  )
}
