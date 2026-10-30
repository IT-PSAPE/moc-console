import { createContext } from 'react'

type CheckboxGroupValue = {
  state: { values: readonly string[] }
  actions: { toggle: (value: string) => void }
  meta: { disabled: boolean }
}
export const CheckboxGroupContext = createContext<CheckboxGroupValue | null>(null)
