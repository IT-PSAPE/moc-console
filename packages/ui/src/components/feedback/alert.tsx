import { cn } from '@moc/utils/cn'
import { cv } from '@moc/utils/cv'
import { Label, Paragraph } from '../display/text'
import { AlertCircle, CheckCircle2, Info, Lightbulb, TriangleAlert, X } from 'lucide-react'
import type { HTMLAttributes, ReactNode } from 'react'

// ─── Types ──────────────────────────────────────────────────────────

export type FeedbackVariant = 'error' | 'warning' | 'success' | 'info' | 'feature'
export type FeedbackStyle = 'filled' | 'outline'

// ─── Variant Icons ──────────────────────────────────────────────────

const variantIcons: Record<FeedbackVariant, ReactNode> = {
    error: <AlertCircle className="size-4" />,
    warning: <TriangleAlert className="size-4" />,
    success: <CheckCircle2 className="size-4" />,
    info: <Info className="size-4" />,
    feature: <Lightbulb className="size-4" />,
}

// ─── Variants ───────────────────────────────────────────────────────

const alertVariants = cv({
    base: ['flex items-start gap-3 rounded-lg p-3'],
    variants: {
        variant: {
            error: [''],
            warning: [''],
            success: [''],
            info: [''],
            feature: [''],
        },
        style: {
            filled: ['border border-transparent'],
            outline: ['bg-primary border'],
        },
    },
    defaultVariants: {
        variant: 'info',
        style: 'filled',
    },
})

const colorMap: Record<FeedbackVariant, Record<FeedbackStyle, string>> = {
    error: {
        filled: 'bg-utility-red-50 text-utility-red-700',
        outline: 'border-utility-red-700/20 text-utility-red-700',
    },
    warning: {
        filled: 'bg-utility-yellow-50 text-utility-yellow-700',
        outline: 'border-utility-yellow-700/20 text-utility-yellow-700',
    },
    success: {
        filled: 'bg-utility-green-50 text-utility-green-700',
        outline: 'border-utility-green-700/20 text-utility-green-700',
    },
    info: {
        filled: 'bg-utility-blue-50 text-utility-blue-700',
        outline: 'border-utility-blue-700/20 text-utility-blue-700',
    },
    feature: {
        filled: 'bg-utility-purple-50 text-utility-purple-700',
        outline: 'border-utility-purple-700/20 text-utility-purple-700',
    },
}

// ─── Component ──────────────────────────────────────────────────────

type AlertProps = Omit<HTMLAttributes<HTMLDivElement>, 'style'> & {
    title: string
    description?: string
    variant?: FeedbackVariant
    style?: FeedbackStyle
    dismissible?: boolean
    onDismiss?: () => void
    icon?: ReactNode
}

export function Alert({ title, description, variant = 'info', style = 'filled', dismissible = false, onDismiss, icon, className, ...props}: AlertProps) {
    return (
        <div
            role="alert"
            className={cn(alertVariants({ variant, style }), colorMap[variant][style], className)}
            {...props}
        >
            <span className="shrink-0 mt-0.5">{icon ?? variantIcons[variant]}</span>
            <div className="flex-1 min-w-0">
                <Label.sm className="text-inherit">{title}</Label.sm>
                {description && (
                    <Paragraph.sm className="text-inherit/80 mt-0.5">{description}</Paragraph.sm>
                )}
            </div>
            {dismissible && onDismiss && (
                <button
                    type="button"
                    onClick={onDismiss}
                    className="shrink-0 mt-0.5 cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
                    aria-label="Dismiss"
                >
                    <X className="size-4" />
                </button>
            )}
        </div>
    )
}
