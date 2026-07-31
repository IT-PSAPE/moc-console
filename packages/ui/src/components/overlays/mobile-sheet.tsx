import { cn } from '@moc/utils/cn'
import type { HTMLAttributes } from 'react'

export const mobileSheetBackdropClassName = cn(
    'pointer-events-auto fixed inset-0 bg-black/30 backdrop-blur-xs',
    'transition-opacity duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0',
)

export const mobileSheetPositionerClassName = cn(
    'pointer-events-none !fixed !inset-0 !z-[9050] !flex !h-auto !w-auto !transform-none items-end justify-center outline-none',
)

export const mobileSheetPopupClassName = cn(
    'pointer-events-auto flex !w-full !max-w-none flex-col overflow-hidden rounded-t-3xl border border-b-0 border-secondary bg-primary shadow-xl outline-none',
    '!max-h-[calc(100dvh-max(0.5rem,env(safe-area-inset-top)))] pb-[env(safe-area-inset-bottom)]',
    'origin-bottom transition-[opacity,transform] duration-250',
    'data-[starting-style]:translate-y-full data-[starting-style]:opacity-0',
    'data-[ending-style]:translate-y-full data-[ending-style]:opacity-0',
)

export function MobileSheetHandle({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('flex h-5 shrink-0 items-center justify-center', className)} aria-hidden="true" {...props}>
            <div className="h-1 w-9 rounded-full bg-quaternary/60" />
        </div>
    )
}
