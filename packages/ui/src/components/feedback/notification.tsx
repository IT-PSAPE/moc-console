import { Toast as BaseToast } from '@base-ui/react/toast'
import { cn } from '@moc/utils/cn'
import { Label, Paragraph } from '../display/text'
import { AlertCircle, CheckCircle2, Info, Lightbulb, TriangleAlert, X } from 'lucide-react'
import { Button } from '../controls/button'
import type { FeedbackVariant, FeedbackStyle } from './alert'
import type { ReactNode } from 'react'

// ─── Variant Icons ──────────────────────────────────────────────────

const variantIcons: Record<FeedbackVariant, ReactNode> = {
    error: <AlertCircle className="size-4" />,
    warning: <TriangleAlert className="size-4" />,
    success: <CheckCircle2 className="size-4" />,
    info: <Info className="size-4" />,
    feature: <Lightbulb className="size-4" />,
}

const colorMap: Record<FeedbackVariant, Record<FeedbackStyle, string>> = {
    error: {
        filled: 'bg-utility-red-50 text-utility-red-700 border-utility-red-700/20',
        outline: 'bg-primary text-utility-red-700 border-utility-red-700/20',
    },
    warning: {
        filled: 'bg-utility-yellow-50 text-utility-yellow-700 border-utility-yellow-700/20',
        outline: 'bg-primary text-utility-yellow-700 border-utility-yellow-700/20',
    },
    success: {
        filled: 'bg-utility-green-50 text-utility-green-700 border-utility-green-700/20',
        outline: 'bg-primary text-utility-green-700 border-utility-green-700/20',
    },
    info: {
        filled: 'bg-utility-blue-50 text-utility-blue-700 border-utility-blue-700/20',
        outline: 'bg-primary text-utility-blue-700 border-utility-blue-700/20',
    },
    feature: {
        filled: 'bg-utility-purple-50 text-utility-purple-700 border-utility-purple-700/20',
        outline: 'bg-primary text-utility-purple-700 border-utility-purple-700/20',
    },
}

// ─── Types ──────────────────────────────────────────────────────────

export type NotificationData = {
    variant: FeedbackVariant
    style: FeedbackStyle
    dismissible: boolean
}

// ─── Component ──────────────────────────────────────────────────────

type NotificationProps = {
    notification: BaseToast.Root.ToastObject<NotificationData>
}

export function Notification({ notification }: NotificationProps) {
    const variant = notification.data?.variant ?? 'info'
    const style = notification.data?.style ?? 'filled'
    const dismissible = notification.data?.dismissible ?? true

    return (
        <BaseToast.Root
            toast={notification}
            swipeDirection={dismissible ? 'right' : []}
            className={cn(
                'pointer-events-auto w-full rounded-lg border shadow-lg outline-none',
                '[transform:translateX(var(--toast-swipe-movement-x))] transition-[opacity,transform] duration-200',
                'data-[starting-style]:translate-x-2 data-[starting-style]:opacity-0 data-[ending-style]:translate-x-2 data-[ending-style]:opacity-0',
                colorMap[variant][style],
            )}
        >
            <BaseToast.Content className="flex items-start gap-3 p-3">
                <span className="mt-0.5 shrink-0">{variantIcons[variant]}</span>
                <div className="min-w-0 flex-1">
                    <BaseToast.Title render={<Label.sm className="text-inherit" />} />
                    {notification.description ? <BaseToast.Description render={<Paragraph.sm className="mt-0.5 text-inherit/80" />} /> : null}
                    {notification.actionProps ? (
                        <div className="mt-2">
                            <BaseToast.Action render={<Button variant="secondary" />} />
                        </div>
                    ) : null}
                </div>
                {dismissible ? (
                    <BaseToast.Close className="mt-0.5 shrink-0 cursor-pointer opacity-70 transition-opacity hover:opacity-100" aria-label="Dismiss">
                        <X className="size-4" />
                    </BaseToast.Close>
                ) : null}
            </BaseToast.Content>
        </BaseToast.Root>
    )
}
