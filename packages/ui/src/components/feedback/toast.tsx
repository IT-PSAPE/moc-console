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

const variantIconColorMap: Record<FeedbackVariant, string> = {
    error: 'text-error',
    warning: 'text-utility-yellow-700',
    success: 'text-success',
    info: 'text-utility-blue-700',
    feature: 'text-utility-purple-700',
}

// ─── Types ──────────────────────────────────────────────────────────

export type ToastData = {
    variant: FeedbackVariant
    style: FeedbackStyle
    dismissible: boolean
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
            swipeDirection={dismissible ? 'right' : []}
            className={cn(
                'pointer-events-auto absolute right-0 bottom-0 w-[22rem] max-w-[calc(100vw-2rem)] origin-bottom-right select-none rounded-xl border border-secondary bg-primary shadow-xl outline-none',
                '[--gap:0.75rem] [--peek:0.5rem] [--scale:calc(max(0,1-(var(--toast-index)*0.05)))] [--shrink:calc(1-var(--scale))]',
                '[--height:var(--toast-frontmost-height,var(--toast-height))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))]',
                'z-[calc(1000-var(--toast-index))] h-[var(--height)]',
                '[transform:translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))]',
                'transition-[transform,opacity,height] duration-300 ease-out motion-reduce:transition-none',
                'data-expanded:h-[var(--toast-height)] data-expanded:[transform:translateX(var(--toast-swipe-movement-x))_translateY(var(--offset-y))]',
                'data-limited:opacity-0 data-[starting-style]:translate-x-full data-[starting-style]:opacity-0',
                'data-[ending-style]:translate-x-full data-[ending-style]:opacity-0',
                'after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-[\'\']',
            )}
        >
            <BaseToast.Content className="flex h-full items-start gap-3 overflow-hidden p-3 transition-opacity duration-200 data-behind:opacity-0 data-expanded:opacity-100 motion-reduce:transition-none">
                <span className={cn('mt-0.5 shrink-0', variantIconColorMap[variant])}>{variantIcons[variant]}</span>
                <div className="min-w-0 flex-1">
                    <BaseToast.Title render={<Label.sm className="text-primary" />} />
                    {toast.description ? <BaseToast.Description render={<Paragraph.sm className="mt-0.5 text-tertiary" />} /> : null}
                    {toast.actionProps ? (
                        <div className="mt-2">
                            <BaseToast.Action render={<Button variant="secondary" size="sm" />} />
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
