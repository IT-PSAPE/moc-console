import { Plus } from 'lucide-react'
import { Button } from '../controls/button'
import { Combobox } from './combobox'
import { ManagedOptionPickerItem } from './managed-option-picker-item'
import { useManagedOptionPicker } from './use-managed-option-picker'

export function ManagedOptionPickerContent() {
    const { state, actions, meta } = useManagedOptionPicker()
    const footer = meta.canCreate && meta.createLabel ? <div className="min-w-0 overflow-hidden border-t border-secondary p-1"><Button variant="ghost" aria-label={`Create “${meta.createLabel}”`} className="min-h-9 landscape:min-h-11 w-full min-w-0 justify-start gap-2 overflow-hidden px-3" onClick={actions.create} disabled={state.busy}><Plus className="size-4 shrink-0" aria-hidden="true" /><span className="block min-w-0 flex-1 truncate text-left">Create “{meta.createLabel}”</span></Button></div> : null
    const footerError = !state.renameOption && state.error ? <p role="alert" className="px-3 py-2 paragraph-xs text-error">{state.error}</p> : null
    function renderOption(option: never) { return <ManagedOptionPickerItem key={meta.keyOf(option)} option={option} /> }
    return (
        <Combobox.Content empty="No matching options" searchPlaceholder={meta.searchPlaceholder} title={meta.label} footer={<>{footer}{footerError}</>}>
            {renderOption}
        </Combobox.Content>
    )
}
