import type { ReactElement } from "react"
import { Unlink } from "lucide-react"
import { Button } from "../controls/button"
import { Paragraph } from "./text"

type LinkedRecordRowProps = {
  label: string
  detail?: string
  render: ReactElement
  onRemove?: () => void
  disabled?: boolean
}

export function LinkedRecordRow({ label, detail, render, onRemove, disabled }: LinkedRecordRowProps) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="min-w-0 flex-1">
        <Button.Link render={render} variant="ghost" className="max-w-full justify-start truncate">{label}</Button.Link>
        {detail && <Paragraph.xs className="px-2 text-tertiary">{detail}</Paragraph.xs>}
      </div>
      {onRemove && <Button.Icon icon={<Unlink />} aria-label={`Unlink ${label}`} variant="ghost" onClick={onRemove} disabled={disabled} />}
    </div>
  )
}
