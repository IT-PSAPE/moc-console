import { useEffect, useState } from "react"
import { MessageCircle } from "lucide-react"
import { Badge } from "@/components/display/badge"
import { Button } from "@/components/controls/button"
import { Paragraph } from "@/components/display/text"
import { useFeedback } from "@/components/feedback/feedback-provider"
import { useAuth } from "@/lib/auth-context"
import { createTelegramLinkToken, unlinkTelegram } from "@/data/fetch-users"

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined

type Props = {
    userId: string
    telegramChatId: string | null
}

export function TelegramLinkRow({ userId, telegramChatId }: Props) {
    const { refreshProfile } = useAuth()
    const { toast } = useFeedback()
    const [busy, setBusy] = useState(false)
    const [awaitingLink, setAwaitingLink] = useState(false)

    useEffect(() => {
        if (!awaitingLink) return

        function onVisibility() {
            if (document.visibilityState === "visible") {
                refreshProfile().catch(() => { /* ignore */ })
            }
        }

        document.addEventListener("visibilitychange", onVisibility)
        return () => document.removeEventListener("visibilitychange", onVisibility)
    }, [awaitingLink, refreshProfile])

    useEffect(() => {
        if (telegramChatId) setAwaitingLink(false)
    }, [telegramChatId])

    async function handleLink() {
        if (!BOT_USERNAME) {
            toast({
                title: "Telegram bot not configured",
                description: "VITE_TELEGRAM_BOT_USERNAME is not set.",
                variant: "error",
            })
            return
        }

        setBusy(true)
        try {
            const { token } = await createTelegramLinkToken(userId)
            const url = `https://t.me/${BOT_USERNAME}?start=${token}`
            window.open(url, "_blank", "noopener,noreferrer")
            setAwaitingLink(true)
        } catch (error) {
            toast({
                title: "Could not start Telegram link",
                description: error instanceof Error ? error.message : "Please try again.",
                variant: "error",
            })
        } finally {
            setBusy(false)
        }
    }

    async function handleUnlink() {
        if (!window.confirm("Unlink your Telegram account from MOC Console?")) return

        setBusy(true)
        try {
            await unlinkTelegram(userId)
            await refreshProfile()
            toast({ title: "Telegram unlinked", variant: "success" })
        } catch (error) {
            toast({
                title: "Could not unlink Telegram",
                description: error instanceof Error ? error.message : "Please try again.",
                variant: "error",
            })
        } finally {
            setBusy(false)
        }
    }

    if (telegramChatId) {
        return (
            <div className="flex items-center gap-2">
                <Badge color="green" icon={<MessageCircle />} label={telegramChatId} />
                <Button variant="ghost" onClick={handleUnlink} disabled={busy} className="px-2 py-1">
                    Unlink
                </Button>
            </div>
        )
    }

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={handleLink}
                disabled={busy}
                className="rounded transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <Badge color="blue" icon={<MessageCircle />} label={busy ? "Opening Telegram…" : "Link Telegram"} />
            </button>
            {awaitingLink && (
                <Paragraph.sm className="text-tertiary">Waiting for Telegram…</Paragraph.sm>
            )}
        </div>
    )
}
