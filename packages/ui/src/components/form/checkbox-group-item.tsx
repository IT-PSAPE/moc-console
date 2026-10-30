import { useContext, type ReactNode } from 'react'
import { Checkbox } from './checkbox'
import { CheckboxGroupContext } from './checkbox-group-context'

export function CheckboxGroupItem({ value, children }: { value: string; children: ReactNode }) {
  const context = useContext(CheckboxGroupContext)
  if (!context) throw new Error('CheckboxGroup.Root is required')
  const { state, actions, meta } = context
  function change(): void { actions.toggle(value) }
  return <Checkbox value={value} checked={state.values.includes(value)} onChange={change} disabled={meta.disabled}>{children}</Checkbox>
}
