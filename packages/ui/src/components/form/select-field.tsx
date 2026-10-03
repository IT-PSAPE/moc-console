import { Select } from "./select"

export type SelectFieldItem<Value extends string> = { label: string; value: Value; description?: string | null }

type SelectFieldProps<Value extends string> = {
  items: SelectFieldItem<Value>[]
  label: string
  name: string
  className?: string
  value: Value
  onValueChange: (value: Value) => void
}

export function SelectField<Value extends string>({ items, label, name, className, value, onValueChange }: SelectFieldProps<Value>) {
  function handleChange(nextValue: Value | null) {
    if (nextValue !== null) onValueChange(nextValue)
  }

  function renderItem(item: SelectFieldItem<Value>) {
    return <Select.Item key={item.value} value={item.value} description={item.description}>{item.label}</Select.Item>
  }

  return (
    <Select.Root name={name} items={items} value={value} onValueChange={handleChange}>
      <Select.Trigger aria-label={label} className={className}/>
      <Select.Content>{items.map(renderItem)}</Select.Content>
    </Select.Root>
  )
}
