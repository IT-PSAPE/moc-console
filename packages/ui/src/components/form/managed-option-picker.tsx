import type { ReactNode } from 'react'
import { Combobox } from './combobox'
import { ManagedOptionPickerContent } from './managed-option-picker-content'
import { ManagedOptionPickerField } from './managed-option-picker-field'
import { ManagedOptionPickerContext, useManagedOptionPickerState } from './use-managed-option-picker'

type ManagedOptionRootProps<Option> = {
    children: ReactNode
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
}

function ManagedOptionRoot<Option>({ children, options, value, onValueChange, getOptionKey, getOptionLabel, onCreate, onRename, getOptionActive, onActiveChange, disabled, label, placeholder }: ManagedOptionRootProps<Option>) {
    const props = { options, value, onValueChange, getOptionKey, getOptionLabel, onCreate, onRename, getOptionActive, onActiveChange, disabled, label, placeholder }
    const { selected, contextValue, equals, optionLabel, disabled: isDisabled } = useManagedOptionPickerState(props)
    return (
        <ManagedOptionPickerContext.Provider value={contextValue}>
            <Combobox.Root items={options} value={selected} onValueChange={contextValue.actions.select as (value: never) => void} onItemHighlighted={contextValue.actions.highlightOption} itemToStringLabel={optionLabel} isItemEqualToValue={equals} inputValue={contextValue.state.query} onInputValueChange={contextValue.actions.changeQuery} open={contextValue.state.open} onOpenChange={contextValue.actions.changeOpen} disabled={isDisabled}>
                {children}
            </Combobox.Root>
        </ManagedOptionPickerContext.Provider>
    )
}

export const ManagedOptionPicker = { Root: ManagedOptionRoot, Field: ManagedOptionPickerField, Content: ManagedOptionPickerContent }
