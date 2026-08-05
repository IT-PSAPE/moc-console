import { UnlinkTelegramModal } from "@/features/account/unlink-telegram-modal"
import { Button } from "@moc/ui/components/controls/button"
import { Paragraph } from "@moc/ui/components/display/text"
import { Send } from "lucide-react"
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
        <Button
          variant="secondary"
          onClick={actions.openUnlink}
          disabled={state.busy}
          className="group hover:!border-utility-red-700/30 hover:!bg-utility-red-50 hover:!text-utility-red-700 focus-visible:!border-utility-red-700/30 focus-visible:!bg-utility-red-50 focus-visible:!text-utility-red-700"
        >
          <span className="inline-flex items-center gap-2">
            <span className="size-2 shrink-0 rounded-full bg-utility-green-500 transition-colors group-hover:bg-utility-red-500 group-focus-visible:bg-utility-red-500" />
            <span className="grid">
              <span className="col-start-1 row-start-1 group-hover:invisible group-focus-visible:invisible">{state.busy ? "Disconnecting…" : "Connected"}</span>
              <span className="invisible col-start-1 row-start-1 group-hover:visible group-focus-visible:visible">Disconnect</span>
            </span>
          </span>
        </Button>
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
