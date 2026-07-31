import { Combobox as BaseCombobox } from '@base-ui/react/combobox'
import { cn } from '@moc/utils/cn'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { createContext, Fragment, useContext, useState, type ReactNode } from 'react'
import { useIsMobile } from '../../hooks/use-is-mobile'
import { MobileSheetHandle, mobileSheetBackdropClassName, mobileSheetPopupClassName, mobileSheetPositionerClassName } from '../overlays/mobile-sheet'
import { useOverlayRegistration, useOverlayStack } from '../overlays/overlay-provider'

// A filterable select over `@base-ui/react/combobox`, in the same visual
// language as Input/Select — same border, focus ring and disabled treatment.
//
// Base UI's multi-select needs a precise nesting of InputGroup › Chips ›
// Value › Chip/Input, and the popup silently never opens if you get it wrong.
// `Combobox.ChipsField` renders that whole structure so callers can't
// misassemble it:
//
//   <Combobox.Root multiple items={options} value={value} onValueChange={setValue}>
//     <Combobox.ChipsField placeholder="Search…" chipLabel={(o) => o.label} />
//     <Combobox.Content>
//       {(o) => <Combobox.Item key={o.id} value={o}>{o.label}</Combobox.Item>}
//     </Combobox.Content>
//   </Combobox.Root>

// ─── Root ────────────────────────────────────────────────────────────

type ComboboxRootProps<Value> = {
    children: ReactNode
    /** The full option list. Base UI filters it against the input value. */
    items?: readonly Value[]
    value?: Value[] | Value | null
    defaultValue?: Value[] | Value | null
    onValueChange?: (value: never) => void
    multiple?: boolean
    disabled?: boolean
    name?: string
    /** Renders an object option as its display string. Not needed for `{ value, label }`. */
    itemToStringLabel?: (item: Value) => string
    /** Identity for object options that aren't referentially stable. */
    isItemEqualToValue?: (item: Value, value: Value) => boolean
    open?: boolean
    defaultOpen?: boolean
    onOpenChange?: (open: boolean, eventDetails: BaseCombobox.Root.ChangeEventDetails) => void
}

type ComboboxContextValue = {
    itemToStringLabel?: (item: unknown) => string
    isMobile: boolean
    multiple: boolean
}

const ComboboxContext = createContext<ComboboxContextValue | null>(null)

function useComboboxContext(): ComboboxContextValue {
    const context = useContext(ComboboxContext)

    if (!context) {
        throw new Error('Combobox parts must be used within Combobox.Root')
    }

    return context
}

function ComboboxRoot<Value>({ children, defaultOpen, itemToStringLabel, multiple = false, onOpenChange, open, ...props }: ComboboxRootProps<Value>) {
    const isMobile = useIsMobile()
    const isControlled = open !== undefined
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen ?? false)
    const isOpen = isControlled ? open : uncontrolledOpen
    useOverlayRegistration(isOpen)

    function handleOpenChange(nextOpen: boolean, eventDetails: BaseCombobox.Root.ChangeEventDetails) {
        if (!isControlled) {
            setUncontrolledOpen(nextOpen)
        }
        onOpenChange?.(nextOpen, eventDetails)
    }

    // Base UI resolves `multiple` at the type level into single- vs
    // multi-value generics, which a runtime-boolean wrapper can't express.
    // The cast is contained here.
    const Root = BaseCombobox.Root as unknown as (
        p: ComboboxRootProps<Value>,
    ) => React.JSX.Element
    return (
        <ComboboxContext.Provider value={{ isMobile, itemToStringLabel: itemToStringLabel as ((item: unknown) => string) | undefined, multiple }}>
            <Root {...props} itemToStringLabel={itemToStringLabel} multiple={multiple} open={isOpen} onOpenChange={handleOpenChange}>{children}</Root>
        </ComboboxContext.Provider>
    )
}

// Base UI allows `className` to be a function of component state. None of
// these wrappers need that, and cn() only takes strings, so each one narrows
// the prop to a plain string.
type Styled<P> = Omit<P, 'className'> & { className?: string }

const fieldShell = cn(
    'flex min-h-11 w-full flex-wrap items-center gap-1 rounded-lg border border-secondary bg-primary px-3 py-2 md:min-h-0',
    'focus-within:border-brand focus-within:ring-3 focus-within:ring-border-brand/10',
    'has-[:disabled]:cursor-not-allowed has-[:disabled]:bg-disabled has-[:disabled]:border-disabled',
)

// ─── Single-value field ──────────────────────────────────────────────

function ComboboxField({ className, ...props }: Styled<React.ComponentProps<typeof BaseCombobox.Input>>) {
    const { isMobile, itemToStringLabel } = useComboboxContext()

    if (isMobile) {
        return (
            <BaseCombobox.Trigger className={cn(fieldShell, 'flex-nowrap text-left', className)} disabled={props.disabled} aria-label={props['aria-label'] ?? props.placeholder}>
                <span className="min-w-0 flex-1 truncate paragraph-sm text-primary">
                    <BaseCombobox.Value>
                        {(selected: unknown) => {
                            if (selected === null || selected === undefined) return props.placeholder
                            if (itemToStringLabel) return itemToStringLabel(selected)
                            if (typeof selected === 'object' && 'label' in selected && typeof selected.label === 'string') return selected.label
                            return String(selected)
                        }}
                    </BaseCombobox.Value>
                </span>
                <BaseCombobox.Icon className="shrink-0 text-quaternary">
                    <ChevronDown className="size-4" />
                </BaseCombobox.Icon>
            </BaseCombobox.Trigger>
        )
    }

    return (
        <BaseCombobox.InputGroup className={cn(fieldShell, 'flex-nowrap', className)}>
            <BaseCombobox.Input
                className="w-full min-w-0 flex-1 bg-transparent paragraph-sm !leading-none focus:!outline-none focus-visible:!outline-0 placeholder:text-placeholder disabled:cursor-not-allowed"
                {...props}
            />
            <BaseCombobox.Icon className="shrink-0 text-quaternary">
                <ChevronDown className="size-4" />
            </BaseCombobox.Icon>
        </BaseCombobox.InputGroup>
    )
}

// ─── Multi-value field ───────────────────────────────────────────────

type ChipsFieldProps<Value> = {
    /** Chip text for one selected value. */
    chipLabel: (value: Value) => string
    /** Stable React key for one selected value. */
    chipKey?: (value: Value) => string
    placeholder?: string
    className?: string
}

function ComboboxChipsField<Value>({ chipLabel, chipKey, placeholder, className }: ChipsFieldProps<Value>) {
    const { isMobile } = useComboboxContext()

    if (isMobile) {
        return (
            <BaseCombobox.Trigger className={cn(fieldShell, 'flex-nowrap text-left', className)} aria-label={placeholder}>
                <span className="min-w-0 flex-1 truncate paragraph-sm text-primary">
                    <BaseCombobox.Value placeholder={placeholder}>
                        {(selected: Value[]) => {
                            if (selected.length === 1) return chipLabel(selected[0])
                            return selected.length > 1 ? `${selected.length} selected` : placeholder
                        }}
                    </BaseCombobox.Value>
                </span>
                <BaseCombobox.Icon className="shrink-0 text-quaternary">
                    <ChevronDown className="size-4" />
                </BaseCombobox.Icon>
            </BaseCombobox.Trigger>
        )
    }

    return (
        <BaseCombobox.InputGroup className={cn(fieldShell, className)}>
            <BaseCombobox.Chips className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                <BaseCombobox.Value>
                    {(selected: Value[]) => (
                        <Fragment>
                            {selected.map((item, index) => (
                                <BaseCombobox.Chip
                                    key={chipKey ? chipKey(item) : `${chipLabel(item)}-${index}`}
                                    className="group flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 label-xs text-secondary outline-none focus-within:bg-tertiary data-[highlighted]:bg-tertiary"
                                    aria-label={chipLabel(item)}
                                >
                                    {chipLabel(item)}
                                    <BaseCombobox.ChipRemove
                                        className="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-quaternary hover:text-primary"
                                        aria-label={`Remove ${chipLabel(item)}`}
                                    >
                                        <X className="size-3" />
                                    </BaseCombobox.ChipRemove>
                                </BaseCombobox.Chip>
                            ))}
                            <BaseCombobox.Input
                                placeholder={selected.length > 0 ? '' : placeholder}
                                className="h-5 min-w-24 flex-1 border-0 bg-transparent p-0 paragraph-sm !leading-none focus:!outline-none focus-visible:!outline-0 placeholder:text-placeholder disabled:cursor-not-allowed"
                            />
                        </Fragment>
                    )}
                </BaseCombobox.Value>
            </BaseCombobox.Chips>
            <BaseCombobox.Icon className="shrink-0 text-quaternary">
                <ChevronDown className="size-4" />
            </BaseCombobox.Icon>
        </BaseCombobox.InputGroup>
    )
}

// ─── Popup ───────────────────────────────────────────────────────────

type ComboboxContentProps = {
    children: ReactNode | ((item: never, index: number) => ReactNode)
    className?: string
    /** Shown when filtering leaves no options. */
    empty?: ReactNode
    searchPlaceholder?: string
    title?: string
}

function ComboboxContent({ children, className, empty = 'No matches', searchPlaceholder = 'Search options', title = 'Choose an option' }: ComboboxContentProps) {
    const { isMobile, multiple } = useComboboxContext()
    const { state: overlayState } = useOverlayStack()

    if (isMobile) {
        return (
            <BaseCombobox.Portal container={overlayState.rootElement ?? undefined}>
                <BaseCombobox.Backdrop className={mobileSheetBackdropClassName} />
                <BaseCombobox.Positioner className={mobileSheetPositionerClassName}>
                    <BaseCombobox.Popup className={cn(mobileSheetPopupClassName, 'h-[min(85dvh,44rem)]', className)}>
                        <MobileSheetHandle />
                        <div className="flex shrink-0 flex-col gap-3 border-b border-secondary px-4 pb-3">
                            <span className="label-md text-primary">{multiple ? 'Select options' : title}</span>
                            <BaseCombobox.InputGroup className={cn(fieldShell, 'flex-nowrap')}>
                                <BaseCombobox.Input
                                    autoFocus
                                    placeholder={searchPlaceholder}
                                    className="w-full min-w-0 flex-1 bg-transparent paragraph-sm !leading-none focus:!outline-none focus-visible:!outline-0 placeholder:text-placeholder"
                                />
                                <BaseCombobox.Icon className="shrink-0 text-quaternary">
                                    <Search className="size-4" />
                                </BaseCombobox.Icon>
                            </BaseCombobox.InputGroup>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
                            <BaseCombobox.Empty className="px-2 py-6 text-center paragraph-sm text-quaternary empty:p-0">
                                {empty}
                            </BaseCombobox.Empty>
                            <BaseCombobox.List>{children as never}</BaseCombobox.List>
                        </div>
                        {multiple ? (
                            <div className="shrink-0 border-t border-secondary p-3">
                                <BaseCombobox.Trigger className="flex min-h-11 w-full items-center justify-center rounded-md bg-brand_solid px-3 label-sm text-primary_on-brand">
                                    Done
                                </BaseCombobox.Trigger>
                            </div>
                        ) : null}
                    </BaseCombobox.Popup>
                </BaseCombobox.Positioner>
            </BaseCombobox.Portal>
        )
    }

    return (
        <BaseCombobox.Portal container={overlayState.rootElement ?? undefined}>
            <BaseCombobox.Positioner sideOffset={6} className="z-[9050] outline-none">
                <BaseCombobox.Popup
                    className={cn(
                        // `pointer-events-auto` is required: #overlay-root sets
                        // `pointer-events: none` so a portalled layer never blocks the
                        // page behind it, and each popup surface opts back in. Without
                        // it the list renders but no item can be clicked or hovered.
                        'pointer-events-auto max-h-[min(var(--available-height),16rem)] w-[var(--anchor-width)] max-w-[var(--available-width)] overflow-y-auto overscroll-contain rounded-md border border-secondary bg-primary p-1 shadow-lg outline-none',
                        'origin-[var(--transform-origin)] transition-[opacity,transform] duration-150',
                        'data-[starting-style]:scale-95 data-[starting-style]:opacity-0',
                        'data-[ending-style]:scale-95 data-[ending-style]:opacity-0',
                        className,
                    )}
                >
                    {/* Base UI keeps this element mounted even when the list is
                        non-empty — it's an aria-live region, and hiding or
                        conditionally rendering it breaks screen-reader
                        announcements. Only its children are conditional, so
                        `empty:p-0` collapses the padding away instead; otherwise
                        every popup carries a blank 24px strip above the options. */}
                    <BaseCombobox.Empty className="px-2 py-3 text-center paragraph-xs text-quaternary empty:p-0">
                        {empty}
                    </BaseCombobox.Empty>
                    <BaseCombobox.List>{children as never}</BaseCombobox.List>
                </BaseCombobox.Popup>
            </BaseCombobox.Positioner>
        </BaseCombobox.Portal>
    )
}

function ComboboxItem({ children, className, ...props }: Styled<React.ComponentProps<typeof BaseCombobox.Item>>) {
    return (
        <BaseCombobox.Item
            className={cn(
                'grid min-h-11 cursor-pointer grid-cols-[1rem_1fr] items-center gap-2 rounded-lg px-4 py-2 paragraph-sm text-secondary outline-none select-none md:min-h-0 md:rounded-sm md:px-2 md:py-1.5',
                'data-[highlighted]:bg-secondary data-[highlighted]:text-primary',
                className,
            )}
            {...props}
        >
            <BaseCombobox.ItemIndicator className="col-start-1 text-brand_solid">
                <Check className="size-3.5" />
            </BaseCombobox.ItemIndicator>
            <span className="col-start-2 min-w-0 truncate">{children}</span>
        </BaseCombobox.Item>
    )
}

function ComboboxGroup({ children, className, ...props }: Styled<React.ComponentProps<typeof BaseCombobox.Group>>) {
    return (
        <BaseCombobox.Group className={cn('py-0.5', className)} {...props}>
            {children}
        </BaseCombobox.Group>
    )
}

function ComboboxGroupLabel({ children, className, ...props }: Styled<React.ComponentProps<typeof BaseCombobox.GroupLabel>>) {
    return (
        <BaseCombobox.GroupLabel className={cn('px-2 py-1 label-xs text-quaternary', className)} {...props}>
            {children}
        </BaseCombobox.GroupLabel>
    )
}

export const Combobox = {
    Root: ComboboxRoot,
    Field: ComboboxField,
    ChipsField: ComboboxChipsField,
    Content: ComboboxContent,
    Item: ComboboxItem,
    Group: ComboboxGroup,
    GroupLabel: ComboboxGroupLabel,
}
