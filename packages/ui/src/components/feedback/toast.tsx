import { Toast as BaseToast } from '@base-ui/react/toast'
import { cn } from '@moc/utils/cn'
import { Label, Paragraph } from '../display/text'
import { AlertCircle, CheckCircle2, Info, Lightbulb, TriangleAlert, X } from 'lucide-react'
import { Button } from '../controls/button'
import type { FeedbackVariant } from './alert'
import type { ToastData } from './feedback-types'
import type { ReactNode } from 'react'

// ─── Variant Icons ──────────────────────────────────────────────────

const variantIcons: Record<FeedbackVariant, ReactNode> = {
    error: <AlertCircle className="size-4" />,
    warning: <TriangleAlert className="size-4" />,
    success: <CheckCircle2 className="size-4" />,
    info: <Info className="size-4" />,
    feature: <Lightbulb className="size-4" />,
}

const variantIconColorMap: Record<FeedbackVariant, string> = {
    error: 'text-error',
    warning: 'text-utility-yellow-700',
    success: 'text-success',
    info: 'text-utility-blue-700',
    feature: 'text-utility-purple-700',
}

// ─── Component ──────────────────────────────────────────────────────

type ToastProps = {
    toast: BaseToast.Root.ToastObject<ToastData>
}

export function Toast({ toast }: ToastProps) {
    const variant = toast.data?.variant ?? 'info'
    const dismissible = toast.data?.dismissible ?? true

    return (
        <BaseToast.Root
            toast={toast}
            swipeDirection={dismissible ? ['right', 'left'] : []}
            className={cn(
                'pointer-events-auto relative w-full shrink-0 rounded-xl border border-secondary bg-primary shadow-lg outline-none',
                '[transform:translateX(var(--toast-swipe-movement-x))] transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none',
                'data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
            )}
        >
            <BaseToast.Content className="flex items-start gap-3 p-3">
                <span className={cn('mt-0.5 shrink-0', variantIconColorMap[variant])}>{variantIcons[variant]}</span>
                <div className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">
                    <BaseToast.Title render={<Label.sm className="text-primary" />} />
                    {toast.description ? <BaseToast.Description render={<Paragraph.sm className="mt-0.5 text-tertiary" />} /> : null}
                    {toast.data?.action || toast.actionProps ? (
                        <div className="mt-2">
                            {toast.data?.action ?? <BaseToast.Action render={<Button variant="secondary" size="sm" />} />}
                        </div>
                    ) : null}
                </div>
                {dismissible ? (
                    <BaseToast.Close render={<Button.Icon aria-label="Dismiss" icon={<X />} variant="ghost" size="sm" className="mt-0.5" />} />
                ) : null}
            </BaseToast.Content>
        </BaseToast.Root>
    )
}
