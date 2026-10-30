import type { ReactNode } from 'react'
import { cn } from '@moc/utils/cn'
import { CheckboxGroupContext } from './checkbox-group-context'

type RootProps = { label: string; values: readonly string[]; onValueChange: (values: string[]) => void; disabled?: boolean; children: ReactNode; className?: string }

export function CheckboxGroupRoot({ label, values, onValueChange, disabled = false, children, className }: RootProps) {
  function toggle(value: string): void {
    if (!disabled) onValueChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value])
  }
  return <CheckboxGroupContext value={{ state: { values }, actions: { toggle }, meta: { disabled } }}>
    <div role="group" aria-label={label} className={cn('flex flex-col gap-1', className)}>{children}</div>
  </CheckboxGroupContext>
}
