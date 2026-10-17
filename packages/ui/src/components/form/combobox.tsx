import { Combobox as BaseCombobox } from '@base-ui/react/combobox'
import { cn } from '@moc/utils/cn'
import { ChevronDown, Search, X } from 'lucide-react'
import { createContext, Fragment, useContext, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useIsLandscape } from '../../hooks/use-is-landscape'
import { Drawer } from '../overlays/drawer'
import { mobileSheetPositionerClassName } from '../overlays/mobile-sheet'
import { useOverlayStack } from '../overlays/overlay-provider'

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
    modal?: boolean
    name?: string
    /** Renders an object option as its display string. Not needed for `{ value, label }`. */
    itemToStringLabel?: (item: Value) => string
    /** Identity for object options that aren't referentially stable. */
    isItemEqualToValue?: (item: Value, value: Value) => boolean
    inputValue?: string
    onInputValueChange?: (value: string) => void
    open?: boolean
    defaultOpen?: boolean
    onOpenChange?: (open: boolean, eventDetails?: BaseCombobox.Root.ChangeEventDetails) => void
    onItemHighlighted?: (value: Value | undefined, eventDetails: BaseCombobox.Root.HighlightEventDetails) => void
}

type ComboboxContextValue = {
    itemToStringLabel?: (item: unknown) => string
    isLandscape: boolean
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

function ComboboxRoot<Value>({ children, defaultOpen, itemToStringLabel, modal, multiple = false, onOpenChange, open, ...props }: ComboboxRootProps<Value>) {
    const isLandscape = useIsLandscape()
    const triggerRef = useRef<HTMLElement | null>(null)
    const isControlled = open !== undefined
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen ?? false)
    const isOpen = isControlled ? open : uncontrolledOpen
    function handleOpenChange(nextOpen: boolean, eventDetails?: BaseCombobox.Root.ChangeEventDetails) {
        if (nextOpen) triggerRef.current = eventDetails?.trigger instanceof HTMLElement ? eventDetails.trigger : null
        if (!isControlled) {
            setUncontrolledOpen(nextOpen)
        }
        onOpenChange?.(nextOpen, eventDetails)
    }

    function handleDrawerOpenChange(nextOpen: boolean) {
        if (nextOpen === isOpen) return
        if (!isControlled) {
            setUncontrolledOpen(nextOpen)
        }
        onOpenChange?.(nextOpen)
    }

    // Base UI resolves `multiple` at the type level into single- vs
    // multi-value generics, which a runtime-boolean wrapper can't express.
    // The cast is contained here.
    const Root = BaseCombobox.Root as unknown as (
        p: ComboboxRootProps<Value>,
    ) => React.JSX.Element
    const combobox = (
        <ComboboxContext.Provider value={{ isLandscape, itemToStringLabel: itemToStringLabel as ((item: unknown) => string) | undefined, multiple }}>
            <Root {...props} itemToStringLabel={itemToStringLabel} modal={isLandscape ? false : modal} multiple={multiple} open={isOpen} onOpenChange={handleOpenChange}>{children}</Root>
        </ComboboxContext.Provider>
    )

    if (!isLandscape) return combobox

    return <Drawer mobileSide="bottom" open={isOpen} onOpenChange={handleDrawerOpenChange} triggerRef={triggerRef}>{combobox}</Drawer>
}

// Base UI allows `className` to be a function of component state. None of
// these wrappers need that, and cn() only takes strings, so each one narrows
// the prop to a plain string.
type Styled<P> = Omit<P, 'className'> & { className?: string }

// `min-h-control` (not the fixed `h-control` every other control uses, see
// docs/design-system.md §2) because the chips variant wraps selected values
// onto a second line — a fixed height would clip them. The single-value
// variant only ever renders one line, so it reads as the same 36px control.
type FieldStyle = 'outline' | 'ghost'
type FieldSize = 'md' | 'sm'

const fieldShellBase = cn(
    'flex w-full flex-wrap items-center gap-2 rounded-lg border px-3 py-1.5',
    'transition-colors focus-within:border-brand focus-within:ring-3 focus-within:ring-border-brand/20',
    'has-aria-invalid:border-error has-aria-invalid:focus-within:ring-border-error/20',
    'has-[:disabled]:cursor-not-allowed has-[:disabled]:text-quaternary',
)

const fieldShellStyle: Record<FieldStyle, string> = {
    outline: 'border-primary bg-primary shadow-xs has-[:disabled]:bg-tertiary has-[:disabled]:border-primary',
    // Transparent until hovered/focused — for detail-page meta rows (spec §7).
    ghost: 'border-transparent bg-transparent shadow-none hover:bg-secondary focus-within:bg-primary focus-within:border-brand',
}

const fieldShellSize: Record<FieldSize, string> = {
    md: 'min-h-control landscape:min-h-control-lg',
    sm: 'min-h-control-sm px-2.5 py-1 landscape:min-h-control-lg',
}

function fieldShellClass(style: FieldStyle = 'outline', size: FieldSize = 'md') {
    return cn(fieldShellBase, fieldShellStyle[style], fieldShellSize[size])
}

const fieldShell = fieldShellClass()

type FieldAppearance = { style?: FieldStyle; size?: FieldSize }

// ─── Single-value field ──────────────────────────────────────────────

function ComboboxField({ className, size, style, ...props }: Styled<Omit<React.ComponentProps<typeof BaseCombobox.Input>, 'size' | 'style'>> & FieldAppearance) {
    const { isLandscape, itemToStringLabel } = useComboboxContext()
    const shell = fieldShellClass(style, size)
    function handleLandscapeKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
        const inputEvent = event as unknown as Parameters<NonNullable<typeof props.onKeyDown>>[0]
        props.onKeyDown?.(inputEvent)
    }

    if (isLandscape) {
        return (
            <BaseCombobox.Trigger id={props.id} className={cn(shell, 'flex-nowrap text-left', className)} disabled={props.disabled} aria-label={props['aria-label'] ?? props.placeholder} aria-keyshortcuts={props['aria-keyshortcuts']} onKeyDown={handleLandscapeKeyDown}>
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
        <BaseCombobox.InputGroup className={cn(shell, 'flex-nowrap', className)}>
            <BaseCombobox.Input
                className="w-full min-w-0 flex-1 bg-transparent paragraph-sm !leading-none focus:!outline-none focus-visible:!outline-0 placeholder:text-quaternary disabled:cursor-not-allowed"
                {...props}
            />
            <BaseCombobox.Icon className="shrink-0 text-quaternary">
                <ChevronDown className="size-4" />
            </BaseCombobox.Icon>
        </BaseCombobox.InputGroup>
    )
}

// ─── Multi-value field ───────────────────────────────────────────────

type ChipsFieldProps<Value> = FieldAppearance & {
    /** Chip text for one selected value. */
    chipLabel: (value: Value) => string
    /** Stable React key for one selected value. */
    chipKey?: (value: Value) => string
    placeholder?: string
    className?: string
}

function ComboboxChipsField<Value>({ chipLabel, chipKey, placeholder, className, size, style }: ChipsFieldProps<Value>) {
    const { isLandscape } = useComboboxContext()
    const shell = fieldShellClass(style, size)

    if (isLandscape) {
        return (
            <BaseCombobox.Trigger className={cn(shell, 'flex-nowrap text-left', className)} aria-label={placeholder}>
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
        <BaseCombobox.InputGroup className={cn(shell, className)}>
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
                                className="h-5 min-w-24 flex-1 border-0 bg-transparent p-0 paragraph-sm !leading-none focus:!outline-none focus-visible:!outline-0 placeholder:text-quaternary disabled:cursor-not-allowed"
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
    footer?: ReactNode
}

function ComboboxContent({ children, className, empty = 'No matches', footer, searchPlaceholder = 'Search options', title = 'Choose an option' }: ComboboxContentProps) {
    const { isLandscape, multiple } = useComboboxContext()
    const { state: overlayState } = useOverlayStack()

    if (isLandscape) {
        return (
            <Drawer.Portal>
                <Drawer.Backdrop />
                <BaseCombobox.Portal container={overlayState.rootElement ?? undefined}>
                    <BaseCombobox.Positioner className={mobileSheetPositionerClassName}>
                        <Drawer.Panel className="[--combobox-visible-content-height:calc(94dvh_-_var(--drawer-snap-point-offset,0px)_-_3rem)]">
                            <Drawer.Content className="overflow-hidden !pb-0">
                                <BaseCombobox.Popup className="flex min-h-0 max-h-[var(--combobox-visible-content-height)] flex-1 flex-col outline-none">
                                    <div className="flex shrink-0 flex-col gap-3 border-b border-secondary px-4 pb-3">
                                        <span className="label-md text-primary">{multiple ? 'Select options' : title}</span>
                                        <BaseCombobox.InputGroup className={cn(fieldShell, 'flex-nowrap')}>
                                            <BaseCombobox.Input
                                                placeholder={searchPlaceholder}
                                                className="w-full min-w-0 flex-1 bg-transparent paragraph-sm !leading-none focus:!outline-none focus-visible:!outline-0 placeholder:text-quaternary"
                                            />
                                            <BaseCombobox.Icon className="shrink-0 text-quaternary">
                                                <Search className="size-4" />
                                            </BaseCombobox.Icon>
                                        </BaseCombobox.InputGroup>
                                    </div>
                                    <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-2">
                                        <BaseCombobox.Empty className="px-2 py-6 text-center paragraph-sm text-quaternary empty:p-0">
                                            {empty}
                                        </BaseCombobox.Empty>
                                        <BaseCombobox.List>{children as never}</BaseCombobox.List>
                                    </div>
                                    {footer}
                                    {multiple ? (
                                        <div className="shrink-0 border-t border-secondary p-3">
                                            <BaseCombobox.Trigger className="flex h-control-lg w-full items-center justify-center rounded-lg bg-brand_solid px-3 label-sm text-on-brand hover:bg-brand_solid/90">
                                                Done
                                            </BaseCombobox.Trigger>
                                        </div>
                                    ) : null}
                                </BaseCombobox.Popup>
                            </Drawer.Content>
                        </Drawer.Panel>
                    </BaseCombobox.Positioner>
                </BaseCombobox.Portal>
            </Drawer.Portal>
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
                        'pointer-events-auto max-h-[min(var(--available-height),16rem)] w-[var(--anchor-width)] max-w-[var(--available-width)] overflow-x-hidden overflow-y-auto overscroll-contain rounded-lg border border-secondary bg-primary p-1 shadow-lg outline-none',
                        'origin-[var(--transform-origin)] transition-[opacity,transform] duration-150 motion-reduce:transition-none',
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
                    {footer}
                </BaseCombobox.Popup>
            </BaseCombobox.Positioner>
        </BaseCombobox.Portal>
    )
}

function ComboboxItem({ children, className, ...props }: Styled<React.ComponentProps<typeof BaseCombobox.Item>>) {
    return (
        <BaseCombobox.Item
            className={cn(
                'h-control landscape:h-control-lg cursor-pointer items-center gap-2 rounded-md px-2.5 label-sm font-medium text-secondary outline-none select-none',
                'data-[highlighted]:bg-secondary data-[highlighted]:text-primary data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
                className,
            )}
            {...props}
        >
            <span className="col-start-2 flex min-w-0 items-center gap-2 overflow-hidden">{children}</span>
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
