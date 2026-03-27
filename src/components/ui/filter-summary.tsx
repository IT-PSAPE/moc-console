import { X } from 'lucide-react'
import type { FilterConfig } from '@/types'

interface FilterSummaryProps {
  filters: FilterConfig[]
  activeFilters: Record<string, string[]>
  onRemove: (key: string, value: string) => void
  onClearAll?: () => void
}

interface ActiveFilterItem {
  key: string
  label: string
  rawValue: string
  value: string
}

function getActiveFilterItems(filters: FilterConfig[], activeFilters: Record<string, string[]>): ActiveFilterItem[] {
  const items: ActiveFilterItem[] = []

  for (const filter of filters) {
    const selectedValues = activeFilters[filter.key] ?? []

    for (const selectedValue of selectedValues) {
      const option = filter.options.find((candidate) => candidate.value === selectedValue)
      if (!option) continue

      items.push({
        key: filter.key,
        label: filter.label,
        rawValue: selectedValue,
        value: option.label,
      })
    }
  }

  return items
}

export function FilterSummary({ filters, activeFilters, onRemove, onClearAll }: FilterSummaryProps) {
  const items = getActiveFilterItems(filters, activeFilters)

  if (items.length === 0) return null

  function handleClearAll() {
    onClearAll?.()
  }

  function createRemoveHandler(key: string, value: string) {
    return function handleRemove() {
      onRemove(key, value)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) => (
        <button
          key={`${item.key}-${item.rawValue}`}
          className="inline-flex items-center gap-2 rounded-lg border border-border-secondary bg-background-primary px-3 py-2 text-xs text-text-secondary transition-colors hover:border-border-primary hover:text-text-primary"
          onClick={createRemoveHandler(item.key, item.rawValue)}
          type="button"
        >
          <span className="font-medium text-text-quaternary">{item.label}</span>
          <span>{item.value}</span>
          <X className="h-3 w-3" />
        </button>
      ))}
      {onClearAll && (
        <button
          className="text-xs font-medium text-text-tertiary transition-colors hover:text-text-secondary"
          onClick={handleClearAll}
          type="button"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
