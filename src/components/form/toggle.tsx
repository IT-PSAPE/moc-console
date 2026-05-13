import { cn } from "@/utils/cn";
import { cv } from "@/utils/cv";
import type { ReactNode } from "react";

type ToggleProps = {
    checked: boolean
    onChange: (next: boolean) => void
    disabled?: boolean
    size?: 'sm' | 'md'
    className?: string
    children?: ReactNode
    'aria-label'?: string
}

const trackVariants = cv({
    base: [
        'relative inline-flex shrink-0 rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-border-brand/10',
        'disabled:cursor-not-allowed disabled:!bg-quaternary',
    ],
    variants: {
        size: {
            sm: ['h-4 w-7'],
            md: ['h-5 w-9'],
        },
        checked: {
            true: ['bg-utility-brand-500'],
            false: ['bg-quaternary'],
        },
    },
    defaultVariants: {
        size: 'md',
        checked: 'false',
    },
})

const thumbVariants = cv({
    base: ['inline-block rounded-full bg-white shadow translate-y-0.5 transition-transform'],
    variants: {
        size: {
            sm: ['size-3'],
            md: ['size-4'],
        },
        checkedAndSize: {
            'sm-on': ['translate-x-3'],
            'sm-off': ['translate-x-0.5'],
            'md-on': ['translate-x-4.5'],
            'md-off': ['translate-x-0.5'],
        },
    },
})

export function Toggle({ checked, onChange, disabled, size = 'md', className, children, ...rest }: ToggleProps) {
    const button = (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cn(trackVariants({ size, checked: checked ? 'true' : 'false' }), !children && className)}
            aria-label={rest['aria-label']}
        >
            <span
                className={thumbVariants({
                    size,
                    checkedAndSize: `${size}-${checked ? 'on' : 'off'}` as 'sm-on' | 'sm-off' | 'md-on' | 'md-off',
                })}
            />
        </button>
    )

    if (!children) return button

    return (
        <label className={cn('inline-flex items-center gap-2 has-[:disabled]:cursor-not-allowed', className)}>
            {button}
            {children}
        </label>
    )
}
