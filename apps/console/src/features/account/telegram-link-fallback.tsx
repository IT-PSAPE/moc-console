import { Button } from "@moc/ui/components/controls/button"
import { Card } from "@moc/ui/components/display/card"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { Check, Copy } from "lucide-react"
import type { PendingTelegramLink, TelegramCopyTarget } from "./use-telegram-link"

type TelegramLinkFallbackProps = {
  botUsername: string
  pending: PendingTelegramLink
  copied: TelegramCopyTarget | null
  onRetry: () => void
  onCopy: (kind: TelegramCopyTarget, value: string) => void
}

export function TelegramLinkFallback({ botUsername, pending, copied, onRetry, onCopy }: TelegramLinkFallbackProps) {
  const command = `/start ${pending.token}`

  function copyUrl() {
    onCopy("url", pending.url)
  }

  function copyCommand() {
    onCopy("command", command)
  }

  return (
    <Card className="gap-3 p-3">
      <div className="flex flex-col gap-0.5">
        <Label.sm>Telegram didn't open?</Label.sm>
        <Paragraph.xs className="text-tertiary">Open the link in Telegram or send the command to @{botUsername}. It expires in 15 minutes.</Paragraph.xs>
      </div>

      <div className="flex items-center gap-2">
        <code className="flex-1 min-w-0 truncate rounded border border-secondary bg-primary px-2 py-1.5 text-xs font-mono">{pending.url}</code>
        <Button.Icon
          aria-label="Copy Telegram link"
          variant="ghost"
          icon={copied === "url" ? <Check className="text-utility-green-700" /> : <Copy />}
          onClick={copyUrl}
        />
      </div>

      <div className="flex items-center gap-2">
        <code className="flex-1 min-w-0 truncate rounded border border-secondary bg-primary px-2 py-1.5 text-xs font-mono">{command}</code>
        <Button.Icon
          aria-label="Copy Telegram command"
          variant="ghost"
          icon={copied === "command" ? <Check className="text-utility-green-700" /> : <Copy />}
          onClick={copyCommand}
        />
      </div>

      <div className="flex justify-end">
        <Button variant="secondary" onClick={onRetry}>Open Telegram again</Button>
      </div>
    </Card>
  )
}
