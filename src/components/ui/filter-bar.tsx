import type { ChangeEvent } from 'react'
import type { FilterConfig } from '@/types'

interface FilterSelectProps {
  filter: FilterConfig
  value: string
  onFilterChange: (key: string, value: string) => void
}

function FilterSelect({ filter, value, onFilterChange }: FilterSelectProps) {
  function handleChange(e: ChangeEvent<HTMLSelectElement>) {
    onFilterChange(filter.key, e.target.value)
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      className="h-9 rounded-lg border border-border-primary bg-background-primary px-3 text-sm text-text-secondary outline-none focus:border-border-brand"
    >
      <option value="">{filter.label}</option>
      {filter.options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

interface FilterBarProps {
  filters: FilterConfig[]
  activeFilters: Record<string, string>
  onFilterChange: (key: string, value: string) => void
}

export function FilterBar({ filters, activeFilters, onFilterChange }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <FilterSelect
          key={filter.key}
          filter={filter}
          value={activeFilters[filter.key] ?? ''}
          onFilterChange={onFilterChange}
        />
      ))}
    </div>
  )
}
