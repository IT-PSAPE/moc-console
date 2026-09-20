import { UnlinkTelegramModal } from "./unlink-telegram-modal"
import { Button } from "@moc/ui/components/controls/button"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { Send, Unplug } from "lucide-react"
import { TelegramLinkFallback } from "./telegram-link-fallback"
import { useTelegramLink } from "./use-telegram-link"

type TelegramLinkRowProps = {
  userId: string
  telegramChatId: string | null
}

export function TelegramLinkRow({ userId, telegramChatId }: TelegramLinkRowProps) {
  const { state, actions, meta } = useTelegramLink(userId, telegramChatId)

  if (telegramChatId) {
    return (
      <>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <span aria-hidden className="size-2 shrink-0 rounded-full bg-utility-green-500" />
            <Label.sm className="text-primary">Connected</Label.sm>
          </span>
          <Button variant="secondary" icon={<Unplug />} onClick={actions.openUnlink} disabled={state.busy}>
            {state.busy ? "Disconnecting…" : "Disconnect"}
          </Button>
        </div>
        <UnlinkTelegramModal
          open={state.unlinkOpen}
          onCancel={actions.closeUnlink}
          onConfirm={actions.unlink}
          isUnlinking={state.busy}
        />
      </>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" icon={<Send />} onClick={actions.link} disabled={state.busy}>
          {state.busy ? "Opening Telegram…" : "Connect Telegram"}
        </Button>
        {state.pending && <Paragraph.sm className="text-tertiary">Waiting for Telegram…</Paragraph.sm>}
      </div>

      {state.pending && meta.botUsername && (
        <TelegramLinkFallback
          botUsername={meta.botUsername}
          pending={state.pending}
          copied={state.copied}
          onRetry={actions.retry}
          onCopy={actions.copy}
        />
      )}
    </div>
  )
}
