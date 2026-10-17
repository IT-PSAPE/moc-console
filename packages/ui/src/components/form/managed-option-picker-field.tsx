import { useManagedOptionPicker } from './use-managed-option-picker'
import { Combobox } from './combobox'
import type { KeyboardEvent } from 'react'

type ManagedOptionPickerFieldProps = { className?: string; size?: 'md' | 'sm'; style?: 'outline' | 'ghost' }

export function ManagedOptionPickerField({ className, size, style }: ManagedOptionPickerFieldProps) {
    const { state, actions, meta } = useManagedOptionPicker()
    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        if ((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu') {
            if (actions.openKeyboardMenu()) event.preventDefault()
        }
    }
    return <Combobox.Field id={meta.fieldId} aria-label={meta.label} aria-keyshortcuts="Shift+F10" placeholder={meta.placeholder} disabled={meta.disabled} value={state.query} className={className} size={size} style={style} onKeyDown={handleKeyDown} />
}
