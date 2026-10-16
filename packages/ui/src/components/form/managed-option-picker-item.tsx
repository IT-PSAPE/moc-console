import { Check, EllipsisVertical, Pencil, ToggleLeft, ToggleRight, X } from 'lucide-react'
import type { MouseEvent, PointerEvent } from 'react'
import { Badge } from '../display/badge'
import { Button } from '../controls/button'
import { Dropdown } from '../overlays/dropdown'
import { Combobox } from './combobox'
import { Input } from './input'
import { useManagedOptionPicker } from './use-managed-option-picker'

type ManagedOptionPickerItemProps = { option: unknown }

export function ManagedOptionPickerItem({ option }: ManagedOptionPickerItemProps) {
    const { state, actions, meta } = useManagedOptionPicker()
    const key = meta.keyOf(option)
    const label = meta.labelOf(option)
    const isActive = meta.isActive(option)
    const isRenaming = state.renameOption !== null && meta.keyOf(state.renameOption) === key
    const rowLabel = meta.showsActiveState && !isActive ? `${label}, inactive` : label
    function handleRename() { actions.openRename(option) }
    function handleActiveChange() { actions.changeContextKey(null); actions.changeActive(option, !isActive) }
    function handleMenuOpenChange(open: boolean) { if (!open) actions.changeContextKey(null) }
    function handleContextMenu(event: MouseEvent) { event.preventDefault(); event.stopPropagation(); actions.changeContextKey(key) }
    function handleOpenMenu(event: MouseEvent) { event.stopPropagation(); actions.changeContextKey(key) }
    function handleKeepComboboxFocus(event: PointerEvent) { event.preventDefault() }

    if (isRenaming) {
        return (
            <div className="w-full min-w-0" data-managed-option-rename-editor="">
                <Combobox.Group className="flex w-full max-w-full min-w-0 items-center gap-1 overflow-hidden">
                    <Input aria-label={`Rename ${label}`} name="managed-option-name" autoFocus maxLength={120} readOnly={state.busy} value={state.renameLabel} onChange={actions.changeRenameLabel} onFocus={actions.handleRenameInputFocus} onKeyDown={actions.handleRenameKeyDown} className="min-w-0 flex-1" />
                    <Button.Icon aria-label="Save rename" variant="ghost" icon={<Check />} disabled={meta.renameDisabled} onClick={actions.saveRenameFromButton} />
                    <Button.Icon aria-label="Cancel rename" variant="ghost" icon={<X />} disabled={state.busy} onClick={actions.cancelRenameFromButton} />
                </Combobox.Group>
                {state.error ? <p role="alert" className="px-2 py-1 paragraph-xs text-error">{state.error}</p> : null}
            </div>
        )
    }

    return (
        <Combobox.Group className="flex w-full max-w-full min-w-0 items-center gap-1 overflow-hidden">
            <Combobox.Item value={option as never} disabled={state.busy} onContextMenu={handleContextMenu} className="min-w-0 flex-1 overflow-hidden" aria-label={rowLabel}>
                <span className="block min-w-0 flex-1 truncate">{label}</span>
                {meta.showsActiveState && !isActive ? <Badge color="gray" variant="outline" label="Inactive" /> : null}
            </Combobox.Item>
            {meta.canRename || meta.canChangeActive ? (
                <Dropdown placement="bottom-end" open={state.contextKey === key} onOpenChange={handleMenuOpenChange}>
                    <Dropdown.Trigger><Button.Icon aria-label={`Manage ${label}`} variant="ghost" icon={<EllipsisVertical />} disabled={state.busy} onClick={handleOpenMenu} onPointerDown={handleKeepComboboxFocus} data-managed-option-menu-trigger="" /></Dropdown.Trigger>
                    <Dropdown.Panel data-managed-option-menu-content="">
                        {meta.canRename ? <Dropdown.Item disabled={state.busy} closeOnClick={false} onSelect={handleRename}><Pencil className="size-4" aria-hidden="true" />Rename</Dropdown.Item> : null}
                        {meta.canChangeActive ? <Dropdown.Item disabled={state.busy} closeOnClick={false} onSelect={handleActiveChange}>{isActive ? <ToggleLeft className="size-4" aria-hidden="true" /> : <ToggleRight className="size-4" aria-hidden="true" />}{isActive ? 'Deactivate' : 'Activate'}</Dropdown.Item> : null}
                    </Dropdown.Panel>
                </Dropdown>
            ) : null}
        </Combobox.Group>
    )
}
