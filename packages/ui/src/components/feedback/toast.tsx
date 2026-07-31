import { Toast as BaseToast } from '@base-ui/react/toast'
import { cn } from '@moc/utils/cn'
import { Label, Paragraph } from '../display/text'
import { AlertCircle, CheckCircle2, Info, Lightbulb, TriangleAlert, X } from 'lucide-react'
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

export type ToastData = {
    variant: FeedbackVariant
    style: FeedbackStyle
}

// ─── Component ──────────────────────────────────────────────────────

type ToastProps = {
    toast: BaseToast.Root.ToastObject<ToastData>
}

export function Toast({ toast }: ToastProps) {
    const variant = toast.data?.variant ?? 'info'
    const style = toast.data?.style ?? 'filled'

    return (
        <BaseToast.Root
            toast={toast}
            swipeDirection="down"
            className={cn(
                'pointer-events-auto w-full rounded-lg border shadow-lg outline-none',
                '[transform:translateY(var(--toast-swipe-movement-y))] transition-[opacity,transform] duration-200',
                'data-[starting-style]:translate-y-2 data-[starting-style]:opacity-0 data-[ending-style]:translate-y-2 data-[ending-style]:opacity-0',
                colorMap[variant][style],
            )}
        >
            <BaseToast.Content className="flex items-start gap-3 p-3">
                <span className="mt-0.5 shrink-0">{variantIcons[variant]}</span>
                <div className="min-w-0 flex-1">
                    <BaseToast.Title render={<Label.sm className="text-inherit" />} />
                    {toast.description ? <BaseToast.Description render={<Paragraph.sm className="mt-0.5 text-inherit/80" />} /> : null}
                </div>
                <BaseToast.Close className="mt-0.5 shrink-0 cursor-pointer opacity-70 transition-opacity hover:opacity-100" aria-label="Dismiss">
                    <X className="size-4" />
                </BaseToast.Close>
            </BaseToast.Content>
        </BaseToast.Root>
    )
}
