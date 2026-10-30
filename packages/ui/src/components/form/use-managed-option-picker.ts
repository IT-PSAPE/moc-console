import { createContext, useContext, useEffect, useId, useRef, useState, type ChangeEvent, type FocusEvent as ReactFocusEvent, type KeyboardEvent, type MouseEvent } from 'react'
import { useFeedback } from '../feedback/feedback-provider'

type ComboboxOpenChangeDetails = { reason: string; event: Event; cancel: () => void }

export type ManagedOptionPickerValue = {
    state: { options: readonly unknown[]; value: string | null; query: string; open: boolean; highlightedOption: unknown | null; renameOption: unknown | null; renameLabel: string; busy: boolean; error: string | null; contextKey: string | null }
    actions: { select: (option: unknown | null) => void; changeQuery: (query: string) => void; changeOpen: (open: boolean, eventDetails?: ComboboxOpenChangeDetails) => void; highlightOption: (option: unknown | undefined) => void; openKeyboardMenu: () => boolean; handleRenameInputFocus: (event: ReactFocusEvent<HTMLInputElement>) => void; handleRenameKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void; saveRenameFromButton: (event: MouseEvent) => void; cancelRenameFromButton: (event: MouseEvent) => void; restoreFieldFocus: () => void; create: () => void; openRename: (option: unknown) => void; cancelRename: () => void; changeRenameLabel: (event: ChangeEvent<HTMLInputElement>) => void; rename: () => void; changeContextKey: (key: string | null, event?: MouseEvent) => void; changeActive: (option: unknown, active: boolean) => void }
    meta: { keyOf: (option: unknown) => string; labelOf: (option: unknown) => string; isActive: (option: unknown) => boolean; fieldId: string; label: string; placeholder: string; searchPlaceholder: string; createLabel: string; renameDisabled: boolean; disabled: boolean; canCreate: boolean; canRename: boolean; canChangeActive: boolean; showsActiveState: boolean }
}

export const ManagedOptionPickerContext = createContext<ManagedOptionPickerValue | null>(null)

export function useManagedOptionPicker() {
    const context = useContext(ManagedOptionPickerContext)
    if (!context) throw new Error('ManagedOptionPicker parts must be used within ManagedOptionPicker.Root')
    return context
}

export function normalizeManagedOptionLabel(label: string) { return label.trim().replace(/\s+/g, ' ') }

export function isManagedOptionNameAvailable<Option>(label: string, options: readonly Option[], getOptionLabel: (option: Option) => string, getOptionKey: (option: Option) => string, excludeKey?: string): boolean {
    const normalized = normalizeManagedOptionLabel(label).toLowerCase()
    return Boolean(normalized) && !options.some((option) => getOptionKey(option) !== excludeKey && normalizeManagedOptionLabel(getOptionLabel(option)).toLowerCase() === normalized)
}

export function resolveManagedOptionCreateResult<Option>(optionsAtStart: readonly Option[], currentOptions: readonly Option[], created: Option, getOptionKey: (option: Option) => string): Option | null {
    const optionsUnchanged = currentOptions.length === optionsAtStart.length && currentOptions.every((option, index) => getOptionKey(option) === getOptionKey(optionsAtStart[index]))
    if (optionsUnchanged) return created
    return currentOptions.find((option) => getOptionKey(option) === getOptionKey(created)) ?? null
}

export function useManagedOptionPickerState<Option>({ options, value, onValueChange, getOptionKey, getOptionLabel, onCreate, onRename, getOptionActive, onActiveChange, disabled = false, label, placeholder }: {
    options: readonly Option[]
    value: string | null
    onValueChange: (option: Option | null) => void
    getOptionKey: (option: Option) => string
    getOptionLabel: (option: Option) => string
    onCreate?: (label: string) => Promise<Option>
    onRename?: (option: Option, label: string) => Promise<Option>
    getOptionActive?: (option: Option) => boolean
    onActiveChange?: (option: Option, active: boolean) => Promise<Option>
    disabled?: boolean
    label: string
    placeholder: string
}) {
    const { toast } = useFeedback()
    const fieldId = useId()
    const [query, setQuery] = useState(() => {
        const selected = options.find((option) => getOptionKey(option) === value)
        return selected ? getOptionLabel(selected) : ''
    })
    const [open, setOpen] = useState(false)
    const [highlightedOption, setHighlightedOption] = useState<Option | null>(null)
    const [renameOption, setRenameOption] = useState<Option | null>(null)
    const [renameLabel, setRenameLabel] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [contextKey, setContextKey] = useState<string | null>(null)
    const queryEdited = useRef(false)
    const currentOptions = useRef(options)
    currentOptions.current = options
    const currentOpen = useRef(open)
    currentOpen.current = open
    const mounted = useRef(false)
    useEffect(() => {
        mounted.current = true
        return () => { mounted.current = false }
    }, [])
    useEffect(() => {
        if (open || queryEdited.current) return
        const selected = options.find((option) => getOptionKey(option) === value)
        setQuery(selected ? getOptionLabel(selected) : '')
    }, [getOptionKey, getOptionLabel, open, options, value])
    const normalizedQuery = normalizeManagedOptionLabel(query)
    const searchPlaceholder = `Search ${label.toLocaleLowerCase()}`
    const canCreate = Boolean(onCreate && isManagedOptionNameAvailable(normalizedQuery, options, getOptionLabel, getOptionKey))

    function showOperationError(title: string, cause: unknown): void {
        if (mounted.current) toast({ title, description: cause instanceof Error ? cause.message : 'Try again.', variant: 'error' })
    }

    function select(option: unknown | null) {
        const selected = option as Option | null
        setRenameOption(null)
        setError(null)
        queryEdited.current = false
        setQuery(selected ? getOptionLabel(selected) : '')
        setOpen(false)
        onValueChange(selected)
    }
    function changeQuery(nextQuery: string) { queryEdited.current = true; setQuery(nextQuery); setError(null) }
    function highlightOption(option: unknown | undefined) { setHighlightedOption(option === undefined ? null : option as Option) }
    function openKeyboardMenu() {
        const currentHighlight = highlightedOption ? options.find((candidate) => getOptionKey(candidate) === getOptionKey(highlightedOption)) : null
        const option = currentHighlight ?? options.find((candidate) => getOptionKey(candidate) === value) ?? null
        if (!option || disabled || busy || (!onRename && !onActiveChange)) return false
        setContextKey(getOptionKey(option))
        return true
    }
    async function create() {
        if (!onCreate || !canCreate || busy) return
        const optionsAtStart = options
        setBusy(true); setError(null)
        try {
            const created = await onCreate(normalizedQuery)
            if (!mounted.current) return
            const selectedCreated = resolveManagedOptionCreateResult(optionsAtStart, currentOptions.current, created, getOptionKey)
            if (selectedCreated) {
                onValueChange(selectedCreated)
                setQuery(getOptionLabel(selectedCreated))
                queryEdited.current = false
                setOpen(false)
            }
        } catch (cause) {
            showOperationError('Could not create option', cause)
        } finally { if (mounted.current) setBusy(false) }
    }
    function openRename(option: unknown) {
        setRenameOption(option as Option)
        setRenameLabel(getOptionLabel(option as Option))
        setContextKey(null)
        setError(null)
    }
    function handleRenameInputFocus(event: ReactFocusEvent<HTMLInputElement>) { event.stopPropagation() }
    function restoreFieldFocus() {
        requestAnimationFrame(() => {
            if (currentOpen.current) document.getElementById(fieldId)?.focus()
        })
    }
    function handleRenameKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); rename() }
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancelRename(); restoreFieldFocus() }
    }
    function saveRenameFromButton(event: MouseEvent) { event.stopPropagation(); rename() }
    function cancelRenameFromButton(event: MouseEvent) { event.stopPropagation(); cancelRename(); restoreFieldFocus() }
    function cancelRename() {
        if (busy) return
        setRenameOption(null)
        setError(null)
    }
    function changeRenameLabel(event: ChangeEvent<HTMLInputElement>) { setRenameLabel(event.currentTarget.value); setError(null) }
    async function rename() {
        if (!onRename || !renameOption || busy) return
        const nextLabel = normalizeManagedOptionLabel(renameLabel)
        if (!nextLabel) { setError('Enter a name.'); return }
        if (!isManagedOptionNameAvailable(nextLabel, options, getOptionLabel, getOptionKey, getOptionKey(renameOption))) { setError('An option with this name already exists.'); return }
        setBusy(true); setError(null)
        try {
            const renamed = await onRename(renameOption, nextLabel)
            if (!mounted.current) return
            if (value === getOptionKey(renameOption)) {
                onValueChange(renamed)
                setQuery(getOptionLabel(renamed))
                queryEdited.current = false
            }
            setRenameOption(null)
            restoreFieldFocus()
        } catch (cause) {
            showOperationError('Could not rename option', cause)
        } finally { if (mounted.current) setBusy(false) }
    }
    async function changeActive(option: unknown, active: boolean) {
        if (!onActiveChange || busy) return
        setBusy(true); setError(null)
        try {
            const updated = await onActiveChange(option as Option, active)
            if (!mounted.current) return
            if (value === getOptionKey(option as Option)) onValueChange(updated)
        } catch (cause) {
            showOperationError('Could not update option', cause)
        } finally { if (mounted.current) setBusy(false) }
    }
    function changeContextKey(key: string | null, event?: MouseEvent) { event?.preventDefault(); event?.stopPropagation(); setContextKey(key) }
    function changeOpen(nextOpen: boolean, eventDetails?: ComboboxOpenChangeDetails) {
        if (!nextOpen && eventDetails) {
            const eventTarget = eventDetails.event.target
            const nextFocusedElement = (eventDetails.event as globalThis.FocusEvent).relatedTarget
            const actionTriggered = eventTarget instanceof Element && Boolean(eventTarget.closest('[data-managed-option-menu-trigger], [data-managed-option-rename-editor]'))
            const actionFocused = nextFocusedElement instanceof Element && Boolean(nextFocusedElement.closest('[data-managed-option-menu-trigger]'))
            const menuFocused = nextFocusedElement instanceof Element && Boolean(nextFocusedElement.closest('[data-managed-option-menu-content]'))
            const editorFocused = nextFocusedElement instanceof Element && Boolean(nextFocusedElement.closest('[data-managed-option-rename-editor]'))
            if (actionTriggered || actionFocused || menuFocused || editorFocused) {
                eventDetails.cancel()
                return
            }
        }
        setOpen(nextOpen)
        if (nextOpen) {
            queryEdited.current = false
            return
        }
        setRenameOption(null)
        setError(null)
        setContextKey(null)
        const selected = options.find((option) => getOptionKey(option) === value)
        queryEdited.current = false
        setQuery(selected ? getOptionLabel(selected) : '')
    }
    const selected = options.find((option) => getOptionKey(option) === value) ?? null
    const contextValue: ManagedOptionPickerValue = {
        state: { options, value, query, open, highlightedOption, renameOption, renameLabel, busy, error, contextKey },
        actions: { select, changeQuery, changeOpen, highlightOption, openKeyboardMenu, handleRenameInputFocus, handleRenameKeyDown, saveRenameFromButton, cancelRenameFromButton, restoreFieldFocus, create, openRename, cancelRename, changeRenameLabel, rename, changeContextKey, changeActive },
        meta: { keyOf: getOptionKey as (option: unknown) => string, labelOf: getOptionLabel as (option: unknown) => string, isActive: (option: unknown) => getOptionActive?.(option as Option) ?? true, fieldId, label, placeholder, searchPlaceholder, createLabel: normalizedQuery, renameDisabled: busy || !normalizeManagedOptionLabel(renameLabel), disabled, canCreate: canCreate && !disabled, canRename: Boolean(onRename) && !disabled, canChangeActive: Boolean(onActiveChange && getOptionActive) && !disabled, showsActiveState: Boolean(getOptionActive) },
    }
    function equals(left: Option, right: Option) { return getOptionKey(left) === getOptionKey(right) }
    function optionLabel(option: Option) { return getOptionLabel(option) }
    return { selected, contextValue, equals, optionLabel, disabled }
}
