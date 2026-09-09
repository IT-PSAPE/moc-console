import { cn } from '@moc/utils/cn'
import type { HTMLAttributes } from 'react'

export const mobileSheetPositionerClassName = cn(
    'pointer-events-none !fixed !inset-0 !z-[9050] !flex !h-auto !w-auto !transform-none items-end justify-center outline-none',
)

// Base UI supplies the live swipe, snap-point, and nested-drawer values used
// here. Keeping the complete transform on the popup lets its gesture engine
// interpolate between detents while recessing parent sheets natively.
export const mobileDrawerStackPopupClassName = cn(
    'group/sheet [--sheet-peek:0.75rem] [--sheet-stack-step:0.04]',
    '[--sheet-stack-progress:clamp(0,var(--drawer-swipe-progress),1)]',
    '[--sheet-stack-peek-offset:max(0px,calc((var(--nested-drawers)-var(--sheet-stack-progress))*var(--sheet-peek)))]',
    '[--sheet-stack-scale-base:max(0,calc(1-(var(--nested-drawers)*var(--sheet-stack-step))))]',
    '[--sheet-stack-scale:calc(var(--sheet-stack-scale-base)+(var(--sheet-stack-step)*var(--sheet-stack-progress)))]',
    '[--sheet-stack-shrink:calc(1-var(--sheet-stack-scale))]',
    '[--sheet-stack-height:max(0px,var(--drawer-frontmost-height,var(--drawer-height)))]',
    '[--sheet-translate-y:calc(var(--drawer-snap-point-offset,0px)+var(--drawer-swipe-movement-y)-var(--sheet-stack-peek-offset)-(var(--sheet-stack-shrink)*var(--sheet-stack-height)))]',
    'data-[nested-drawer-open]:[--sheet-translate-y:calc(var(--drawer-swipe-movement-y)-var(--sheet-stack-peek-offset)-(var(--sheet-stack-shrink)*var(--sheet-stack-height)))]',
    '[transform:translateY(var(--sheet-translate-y))_scale(var(--sheet-stack-scale))]',
    'origin-[50%_100%] will-change-transform',
    'transition-[transform,height,opacity] duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none',
    'data-[swiping]:duration-0 data-[nested-drawer-swiping]:duration-0',
    'data-[starting-style]:[transform:translateY(100%)] data-[starting-style]:opacity-0',
    'data-[ending-style]:[transform:translateY(100%)] data-[ending-style]:opacity-0',
    'data-[nested-drawer-open]:h-[var(--sheet-stack-height)] data-[nested-drawer-open]:overflow-hidden',
)

export const mobileDrawerStackContentClassName = cn(
    'flex min-h-0 flex-1 flex-col transition-opacity duration-300 motion-reduce:transition-none',
    'group-data-[nested-drawer-open]/sheet:opacity-0 group-data-[nested-drawer-swiping]/sheet:opacity-100',
)

export function MobileSheetHandle({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('flex h-11 shrink-0 touch-none select-none items-center justify-center active:cursor-grabbing', className)} aria-hidden="true" {...props}>
            <div className="h-1.5 w-10 rounded-full bg-quaternary/70" />
        </div>
    )
}
