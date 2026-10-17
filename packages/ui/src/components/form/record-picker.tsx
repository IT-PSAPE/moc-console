import { Combobox } from "./combobox"

export type RecordPickerOption = { value: string; label: string }
type RecordPickerProps = {
  label: string
  placeholder: string
  options: RecordPickerOption[]
  value: string | null
  disabled?: boolean
  onSelect: (value: string | null) => void
  /** Field appearance passthrough — `style="ghost"` for detail-page meta rows. */
  style?: "outline" | "ghost"
  size?: "md" | "sm"
}

/** Searchable association control; persistence belongs to its consumer. */
export function RecordPicker({ label, placeholder, options, value, disabled, onSelect, style, size }: RecordPickerProps) {
  const selected = options.find((option) => option.value === value) ?? null
  function select(option: RecordPickerOption | null) { onSelect(option?.value ?? null) }
  function renderOption(option: RecordPickerOption) {
    return <Combobox.Item key={option.value} value={option}>{option.label}</Combobox.Item>
  }
  function equals(left: RecordPickerOption, right: RecordPickerOption) { return left.value === right.value }

  return (
    <Combobox.Root items={options} value={selected} onValueChange={select} disabled={disabled} isItemEqualToValue={equals}>
      <Combobox.Field aria-label={label} placeholder={placeholder} disabled={disabled} style={style} size={size} />
      <Combobox.Content empty="No matching records" searchPlaceholder="Search" title={label}>{options.map(renderOption)}</Combobox.Content>
    </Combobox.Root>
  )
}
