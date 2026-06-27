import { Toggle as BaseToggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import { cn } from '@moc/utils/cn'
import type { HTMLAttributes, ReactNode } from 'react'

// ─── Root ────────────────────────────────────────────────
//
// Backed by Base UI's ToggleGroup in single-select mode (`multiple={false}`).
// ToggleGroup models its value as an array, so we bridge to/from the single
// string value the public API exposes. Deselecting the active item (which
// Base UI would allow) is suppressed to preserve segmented-control semantics
// where exactly one item stays selected.

type SegmentedControlRootProps = Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> & {
    defaultValue?: string
    fill?: boolean
    onValueChange?: (value: string) => void
    value?: string
}

function SegmentedControlRoot({ children, className, defaultValue = '', fill = false, onValueChange, value, ...props }: SegmentedControlRootProps) {
    const isControlled = value !== undefined

    return (
        <ToggleGroup
            multiple={false}
            value={isControlled ? (value ? [value] : []) : undefined}
            defaultValue={isControlled ? undefined : (defaultValue ? [defaultValue] : [])}
            onValueChange={(groupValue) => {
                const next = groupValue[0]
                // Ignore deselection so one item always remains active.
                if (next !== undefined) {
                    onValueChange?.(next)
                }
            }}
            className={cn(
                'inline-flex items-center gap-1 rounded-lg bg-secondary p-1',
                fill && 'flex w-full',
                className,
            )}
            {...props}
        >
            {children}
        </ToggleGroup>
    )
}

// ─── Item ────────────────────────────────────────────────

type SegmentedControlItemProps = Omit<HTMLAttributes<HTMLButtonElement>, 'value'> & {
    icon?: ReactNode
    value: string
    hide?: boolean
}

function SegmentedControlItem({ children, className, icon, value, hide, ...props }: SegmentedControlItemProps) {
    if (hide) return null

    return (
        <BaseToggle
            value={value}
            className={cn(
                'inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-1.5 label-sm transition-colors',
                'text-tertiary hover:text-primary',
                'data-[pressed]:bg-primary data-[pressed]:text-brand_secondary data-[pressed]:shadow-sm',
                className,
            )}
            {...props}
        >
            {icon && <span className="flex size-4 shrink-0 items-center justify-center">{icon}</span>}
            {children}
        </BaseToggle>
    )
}

// ─── Compound Export ─────────────────────────────────────

export const SegmentedControl = Object.assign(SegmentedControlRoot, {
    Item: SegmentedControlItem,
})
