import { useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import type { FilterConfig } from '@/types'

interface FilterDrawerProps {
  filters: FilterConfig[]
  activeFilters: Record<string, string>
  onFilterChange: (key: string, value: string) => void
}

export function FilterDrawer({ filters, activeFilters, onFilterChange }: FilterDrawerProps) {
  const [open, setOpen] = useState(false)

  const activeCount = Object.values(activeFilters).filter(Boolean).length

  function handleOpen() {
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
  }

  function handleClearAll() {
    for (const filter of filters) {
      onFilterChange(filter.key, '')
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className={`relative flex h-9 items-center gap-2 rounded-lg border px-3 text-sm transition-colors ${
          activeCount > 0
            ? 'border-border-brand bg-background-brand_primary text-foreground-brand_primary'
            : 'border-border-primary bg-background-primary text-text-secondary hover:border-border-brand hover:text-text-primary'
        }`}
      >
        <SlidersHorizontal className="h-4 w-4" />
        <span>Filters</span>
        {activeCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-background-brand_solid text-xs font-bold text-static-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-background-overlay/40"
            onClick={handleClose}
          />
          <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xs flex-col border-l border-border-primary bg-background-primary shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-border-secondary px-5 py-4">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-text-primary">Filters</h3>
                {activeCount > 0 && (
                  <span className="rounded-full bg-background-brand_solid px-2 py-0.5 text-xs font-bold text-static-white">
                    {activeCount} active
                  </span>
                )}
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg p-1 text-text-tertiary hover:bg-background-secondary_hover hover:text-text-secondary"
                aria-label="Close filters"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
              {filters.map((filter) => (
                <div key={filter.key}>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-quaternary">
                    {filter.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onFilterChange(filter.key, '')}
                      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                        !activeFilters[filter.key]
                          ? 'border-border-brand bg-background-brand_primary text-foreground-brand_primary font-medium'
                          : 'border-border-primary text-text-secondary hover:border-border-brand hover:text-text-primary'
                      }`}
                    >
                      All
                    </button>
                    {filter.options.map((opt) => {
                      const isActive = activeFilters[filter.key] === opt.value

                      function handleSelect() {
                        onFilterChange(filter.key, opt.value)
                      }

                      return (
                        <button
                          key={opt.value}
                          onClick={handleSelect}
                          className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                            isActive
                              ? 'border-border-brand bg-background-brand_primary text-foreground-brand_primary font-medium'
                              : 'border-border-primary text-text-secondary hover:border-border-brand hover:text-text-primary'
                          }`}
                        >
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex shrink-0 items-center justify-between border-t border-border-secondary px-5 py-4">
              <button
                onClick={handleClearAll}
                className="text-sm text-text-tertiary hover:text-text-secondary"
              >
                Clear all
              </button>
              <button
                onClick={handleClose}
                className="rounded-lg bg-background-brand_solid px-4 py-2 text-sm font-medium text-static-white hover:opacity-90"
              >
                Done
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
