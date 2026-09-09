import { useEffect, useState } from "react"
import { createTelegramLinkToken, unlinkTelegram } from "@/data/fetch-users"
import { useAuth } from "@/lib/auth-context"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined

export type PendingTelegramLink = { token: string; url: string }
export type TelegramCopyTarget = "url" | "command"

export function useTelegramLink(userId: string, telegramChatId: string | null) {
  const { refreshProfile } = useAuth()
  const { toast } = useFeedback()
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<PendingTelegramLink | null>(null)
  const [copied, setCopied] = useState<TelegramCopyTarget | null>(null)
  const [unlinkOpen, setUnlinkOpen] = useState(false)

  useEffect(() => {
    if (!pending) return
    function refreshWhenVisible() {
      if (document.visibilityState === "visible") void refreshProfile().catch(() => undefined)
    }
    document.addEventListener("visibilitychange", refreshWhenVisible)
    return () => document.removeEventListener("visibilitychange", refreshWhenVisible)
  }, [pending, refreshProfile])

  useEffect(() => {
    if (!telegramChatId) return
    setPending(null)
    setCopied(null)
  }, [telegramChatId])

  async function link() {
    if (!BOT_USERNAME) {
      toast({ title: "Telegram bot not configured", description: "VITE_TELEGRAM_BOT_USERNAME is not set.", variant: "error" })
      return
    }

    // Opening before the awaited request preserves the tap gesture on iOS.
    const popup = window.open("about:blank", "_blank")
    setBusy(true)
    try {
      const { token } = await createTelegramLinkToken(userId)
      const url = `https://t.me/${BOT_USERNAME}?start=${token}`
      setPending({ token, url })
      if (popup && !popup.closed) {
        popup.location.href = url
        try { popup.opener = null } catch { /* The page may already be cross-origin. */ }
      }
    } catch (error) {
      if (popup && !popup.closed) popup.close()
      toast({
        title: "Could not start Telegram link",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      })
    } finally {
      setBusy(false)
    }
  }

  function retry() {
    if (pending) window.open(pending.url, "_blank", "noopener,noreferrer")
  }

  async function copy(kind: TelegramCopyTarget, value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      window.setTimeout(() => setCopied((current) => current === kind ? null : current), 1500)
    } catch {
      toast({ title: "Could not copy", variant: "error" })
    }
  }

  async function unlink() {
    setBusy(true)
    try {
      await unlinkTelegram(userId)
      await refreshProfile()
      toast({ title: "Telegram disconnected", variant: "success" })
      setUnlinkOpen(false)
    } catch (error) {
      toast({
        title: "Could not disconnect Telegram",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "error",
      })
    } finally {
      setBusy(false)
    }
  }

  function openUnlink() {
    setUnlinkOpen(true)
  }

  function closeUnlink() {
    setUnlinkOpen(false)
  }

  return {
    state: { busy, pending, copied, unlinkOpen },
    actions: { link, retry, copy, unlink, openUnlink, closeUnlink },
    meta: { botUsername: BOT_USERNAME },
  }
}
