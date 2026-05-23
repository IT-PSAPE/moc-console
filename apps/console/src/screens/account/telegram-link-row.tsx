// Telegram linking — UX notes
// ──────────────────────────────────────────────────────────────────────────
// The linking handshake is a bearer-token swap. The console mints a one-shot
// random token T against the logged-in user (telegram_link_tokens row), then
// gets T into the bot conversation as `/start T`. The webhook recovers
// user_id from T, reads message.chat.id from the Telegram payload, and
// writes users.telegram_chat_id. Token + atomic single-use delete are what
// make this safe; the *transport* that carries T to Telegram is irrelevant.
//
// That's why iOS reliability is purely a transport problem. Two failure
// modes we work around here:
//
// 1. Lost user-gesture context. iOS Safari/WKWebView only honour
//    window.open() when called synchronously inside a tap handler. The old
//    code did `await createTelegramLinkToken(...)` before window.open, which
//    on iOS gets treated as a programmatic popup and silently blocked. Fix:
//    open about:blank first (synchronous, still in the gesture), then assign
//    location.href after the token resolves.
//
// 2. Universal Link unreliability. Even when the popup opens, iOS can route
//    `https://t.me/...` to Safari instead of the Telegram app (sticky
//    "open in Safari" preference, in-app webviews, PWA standalone mode,
//    etc.). When that happens `?start=T` does nothing on the t.me web page.
//    Fix: always expose a manual fallback after first click — copyable URL
//    and a copyable `/start T` command the user can paste into the bot
//    conversation themselves. Same token, same handshake, just a different
//    transport.

import { useEffect, useState } from "react"
import { Check, Copy, Send } from "lucide-react"
import { Button } from "@moc/ui/components/controls/button"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"
import { useAuth } from "@/lib/auth-context"
import { createTelegramLinkToken, unlinkTelegram } from "@/data/fetch-users"
import { UnlinkTelegramModal } from "@/features/account/unlink-telegram-modal"

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME as string | undefined

type Props = {
    userId: string
    telegramChatId: string | null
}

type PendingLink = { token: string; url: string }

export function TelegramLinkRow({ userId, telegramChatId }: Props) {
    const { refreshProfile } = useAuth()
    const { toast } = useFeedback()
    const [busy, setBusy] = useState(false)
    const [pending, setPending] = useState<PendingLink | null>(null)
    const [copied, setCopied] = useState<"url" | "command" | null>(null)
    const [unlinkOpen, setUnlinkOpen] = useState(false)

    useEffect(() => {
        if (!pending) return

        function onVisibility() {
            if (document.visibilityState === "visible") {
                refreshProfile().catch(() => { /* ignore */ })
            }
        }

        document.addEventListener("visibilitychange", onVisibility)
        return () => document.removeEventListener("visibilitychange", onVisibility)
    }, [pending, refreshProfile])

    useEffect(() => {
        if (telegramChatId) {
            setPending(null)
            setCopied(null)
        }
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

        // Open a tab synchronously inside the click handler so iOS Safari
        // keeps the user-gesture context. We redirect it once the token
        // resolves; if the popup was blocked, the user still gets the
        // manual fallback panel below. We deliberately omit
        // "noopener,noreferrer" here because those flags make window.open
        // return null, leaving us with no handle to redirect — the trade-off
        // is mitigated by nulling opener post-navigation below.
        const popup = window.open("about:blank", "_blank")

        setBusy(true)
        try {
            const { token } = await createTelegramLinkToken(userId)
            const url = `https://t.me/${BOT_USERNAME}?start=${token}`
            setPending({ token, url })
            if (popup && !popup.closed) {
                popup.location.href = url
                // Sever the opener link now that we've navigated cross-origin
                // to t.me. Mitigates tabnabbing from the destination.
                try { popup.opener = null } catch { /* cross-origin already */ }
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

    function handleRetryOpen() {
        if (!pending) return
        // Synchronous open inside the gesture — required for iOS.
        window.open(pending.url, "_blank", "noopener,noreferrer")
    }

    async function handleCopy(kind: "url" | "command", value: string) {
        try {
            await navigator.clipboard.writeText(value)
            setCopied(kind)
            window.setTimeout(() => setCopied((current) => (current === kind ? null : current)), 1500)
        } catch {
            toast({ title: "Could not copy", variant: "error" })
        }
    }

    async function handleUnlinkConfirm() {
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

    if (telegramChatId) {
        // Single-button affordance: shows connection status at rest, morphs
        // into the disconnect action on hover/focus. Click opens the
        // confirmation modal — the modal is the safety net for taps.
        return (
            <>
                <Button
                    variant="secondary"
                    onClick={() => setUnlinkOpen(true)}
                    disabled={busy}
                    className="group hover:!border-utility-red-700/30 hover:!bg-utility-red-50 hover:!text-utility-red-700 focus-visible:!border-utility-red-700/30 focus-visible:!bg-utility-red-50 focus-visible:!text-utility-red-700"
                >
                    <span className="inline-flex items-center gap-2">
                        <span className="size-2 shrink-0 rounded-full bg-utility-green-500 transition-colors group-hover:bg-utility-red-500 group-focus-visible:bg-utility-red-500" />
                        <span className="grid">
                            <span className="col-start-1 row-start-1 group-hover:invisible group-focus-visible:invisible">
                                {busy ? "Disconnecting…" : "Connected"}
                            </span>
                            <span className="invisible col-start-1 row-start-1 group-hover:visible group-focus-visible:visible">
                                Disconnect
                            </span>
                        </span>
                    </span>
                </Button>
                <UnlinkTelegramModal
                    open={unlinkOpen}
                    onCancel={() => setUnlinkOpen(false)}
                    onConfirm={handleUnlinkConfirm}
                    isUnlinking={busy}
                />
            </>
        )
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
                <Button variant="secondary" icon={<Send />} onClick={handleLink} disabled={busy}>
                    {busy ? "Opening Telegram…" : "Connect Telegram"}
                </Button>
                {pending && (
                    <Paragraph.sm className="text-tertiary">Waiting for Telegram…</Paragraph.sm>
                )}
            </div>

            {pending && BOT_USERNAME && (
                <TelegramFallback
                    botUsername={BOT_USERNAME}
                    pending={pending}
                    copied={copied}
                    onRetryOpen={handleRetryOpen}
                    onCopy={handleCopy}
                />
            )}
        </div>
    )
}

type FallbackProps = {
    botUsername: string
    pending: PendingLink
    copied: "url" | "command" | null
    onRetryOpen: () => void
    onCopy: (kind: "url" | "command", value: string) => void
}

// Manual transport for when the t.me Universal Link doesn't jump to the
// Telegram app (most often on iOS — see the file header). The user can
// either re-tap the link, copy it to send to another device, or paste the
// `/start <token>` command directly into the bot chat. All three paths
// terminate in the same webhook handshake.
function TelegramFallback({ botUsername, pending, copied, onRetryOpen, onCopy }: FallbackProps) {
    const command = `/start ${pending.token}`

    return (
        <div className="flex flex-col gap-3 rounded-lg border border-secondary bg-secondary_alt p-3">
            <div className="flex flex-col gap-0.5">
                <Label.sm>Telegram didn't open?</Label.sm>
                <Paragraph.xs className="text-tertiary">
                    The link below works from any device. Open it in Telegram or paste the command into a chat with @{botUsername}. Expires in 15 minutes.
                </Paragraph.xs>
            </div>

            <div className="flex flex-col gap-1.5">
                <Label.xs className="text-quaternary uppercase tracking-wide">Link</Label.xs>
                <div className="flex items-center gap-2">
                    <code className="flex-1 min-w-0 truncate rounded border border-secondary bg-primary px-2 py-1.5 text-xs font-mono">
                        {pending.url}
                    </code>
                    <Button.Icon
                        aria-label="Copy link"
                        variant="ghost"
                        icon={copied === "url" ? <Check className="text-utility-green-700" /> : <Copy />}
                        onClick={() => onCopy("url", pending.url)}
                    />
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <Label.xs className="text-quaternary uppercase tracking-wide">Or send to @{botUsername} manually</Label.xs>
                <div className="flex items-center gap-2">
                    <code className="flex-1 min-w-0 truncate rounded border border-secondary bg-primary px-2 py-1.5 text-xs font-mono">
                        {command}
                    </code>
                    <Button.Icon
                        aria-label="Copy command"
                        variant="ghost"
                        icon={copied === "command" ? <Check className="text-utility-green-700" /> : <Copy />}
                        onClick={() => onCopy("command", command)}
                    />
                </div>
            </div>

            <div className="flex items-center justify-end">
                <Button variant="secondary" onClick={onRetryOpen}>
                    Open Telegram again
                </Button>
            </div>
        </div>
    )
}
