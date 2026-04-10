import { cn } from '@/utils/cn'
import { createContext, useCallback, useContext, useMemo, useState, type HTMLAttributes, type ReactNode } from 'react'

// ─── Context ─────────────────────────────────────────────

type SegmentedControlContextValue = {
    value: string
    setValue: (value: string) => void
}

const SegmentedControlContext = createContext<SegmentedControlContextValue | null>(null)

export function useSegmentedControl() {
    const context = useContext(SegmentedControlContext)

    if (!context) {
        throw new Error('useSegmentedControl must be used within a SegmentedControl.Root')
    }

    return context
}

// ─── Root ────────────────────────────────────────────────

type SegmentedControlRootProps = HTMLAttributes<HTMLDivElement> & {
    defaultValue?: string
    fill?: boolean
    onValueChange?: (value: string) => void
    value?: string
}

function SegmentedControlRoot({ children, className, defaultValue = '', fill = false, onValueChange, value, ...props }: SegmentedControlRootProps) {
    const isControlled = value !== undefined
    const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue)

    const currentValue = isControlled ? value : uncontrolledValue

    const setValue = useCallback((nextValue: string) => {
        if (!isControlled) {
            setUncontrolledValue(nextValue)
        }

        onValueChange?.(nextValue)
    }, [isControlled, onValueChange])

    const contextValue = useMemo<SegmentedControlContextValue>(() => ({
        value: currentValue,
        setValue,
    }), [currentValue, setValue])

    return (
        <SegmentedControlContext.Provider value={contextValue}>
            <div
                className={cn(
                    'inline-flex items-center gap-1 rounded-lg bg-secondary p-1',
                    fill && 'flex',
                    className,
                )}
                role="tablist"
                {...props}
            >
                {children}
            </div>
        </SegmentedControlContext.Provider>
    )
}

// ─── Item ────────────────────────────────────────────────

type SegmentedControlItemProps = HTMLAttributes<HTMLButtonElement> & {
    icon?: ReactNode
    value: string
}

function SegmentedControlItem({ children, className, icon, value, ...props }: SegmentedControlItemProps) {
    const { value: selectedValue, setValue } = useSegmentedControl()
    const isActive = value === selectedValue

    return (
        <button
            aria-selected={isActive}
            className={cn(
                'inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-label-sm transition-colors',
                isActive
                    ? 'bg-primary text-brand_secondary shadow-sm'
                    : 'text-tertiary hover:text-primary',
                className,
            )}
            onClick={() => setValue(value)}
            role="tab"
            type="button"
            {...props}
        >
            {icon && <span className="flex size-4 shrink-0 items-center justify-center">{icon}</span>}
            {children}
        </button>
    )
}

// ─── Compound Export ─────────────────────────────────────

export const SegmentedControl = {
    Root: SegmentedControlRoot,
    Item: SegmentedControlItem,
}
