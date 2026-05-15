import { cn } from '@/utils/cn'
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
    id: string
    title: string
    description?: string
    variant: FeedbackVariant
    style: FeedbackStyle
    duration: number
}

// ─── Component ──────────────────────────────────────────────────────

type ToastProps = {
    toast: ToastData
    onDismiss: (id: string) => void
}

export function Toast({ toast, onDismiss }: ToastProps) {
    const { id, title, description, variant, style } = toast

    return (
        <div
            role="status"
            aria-live="polite"
            className={cn(
                'flex items-start gap-3 rounded-lg border p-3 shadow-lg min-w-72 max-w-96 animate-in fade-in slide-in-from-bottom-2',
                colorMap[variant][style],
            )}
        >
            <span className="shrink-0 mt-0.5">{variantIcons[variant]}</span>
            <div className="flex-1 min-w-0">
                <Label.sm className="text-inherit">{title}</Label.sm>
                {description && (
                    <Paragraph.sm className="text-inherit/80 mt-0.5">{description}</Paragraph.sm>
                )}
            </div>
            <button
                type="button"
                onClick={() => onDismiss(id)}
                className="shrink-0 mt-0.5 cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
                aria-label="Dismiss"
            >
                <X className="size-4" />
            </button>
        </div>
    )
}
