import { useState } from 'react'
import { SlidersHorizontal, X, Check } from 'lucide-react'
import type { FilterConfig } from '@/types'
import { useOverlayBehavior } from '@/hooks/use-overlay-behavior'
import { IconButton } from '@/components/ui/icon-button'
import { Button } from '@/components/ui/button'

interface FilterDrawerProps {
  filters: FilterConfig[]
  activeFilters: Record<string, string[]>
  onFilterChange: (key: string, value: string) => void
  onClearAll?: () => void
  onOpenChange?: (open: boolean) => void
  open?: boolean
  title?: string
}

function isFilterChecked(activeFilters: Record<string, string[]>, filterKey: string, value: string) {
  return (activeFilters[filterKey] ?? []).includes(value)
}

export function FilterDrawer({ filters, activeFilters, onFilterChange, onClearAll, onOpenChange, open: controlledOpen, title = 'Filters' }: FilterDrawerProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  const activeCount = Object.values(activeFilters).reduce((sum, arr) => sum + arr.length, 0)
  const { panelRef, closeButtonRef } = useOverlayBehavior({ open, onClose: handleClose })

  function setOpen(nextOpen: boolean) {
    if (controlledOpen == null) {
      setUncontrolledOpen(nextOpen)
    }

    onOpenChange?.(nextOpen)
  }

  function handleOpen() {
    setOpen(true)
  }

  function handleClose() {
    setOpen(false)
  }

  function handleClearAll() {
    onClearAll?.()
  }

  function createOptionToggleHandler(filterKey: string, value: string) {
    return function handleOptionToggle() {
      onFilterChange(filterKey, value)
    }
  }

  return (
    <>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
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
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-background-overlay/40"
            onClick={handleClose}
          />
          <div
            aria-label={title}
            aria-modal="true"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-border-primary bg-background-primary shadow-2xl"
            ref={panelRef}
            role="dialog"
            tabIndex={-1}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border-secondary px-5 py-4">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-text-primary">{title}</h2>
                {activeCount > 0 && (
                  <span className="rounded-full bg-background-brand_solid px-2 py-0.5 text-xs font-bold text-static-white">
                    {activeCount} active
                  </span>
                )}
              </div>
              <IconButton
                icon={<X className="h-5 w-5" />}
                label="Close filters"
                onClick={handleClose}
                ref={closeButtonRef}
              />
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
              {filters.map((filter) => {
                return (
                  <div key={filter.key}>
                    <p className="mb-3 text-xs font-medium uppercase tracking-wider text-text-quaternary">
                      {filter.label}
                    </p>
                    <div className="space-y-1">
                      {filter.options.map((opt) => {
                        const isChecked = isFilterChecked(activeFilters, filter.key, opt.value)

                        return (
                          <label
                            key={opt.value}
                            className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-background-primary_hover"
                          >
                            <span
                              role="checkbox"
                              aria-checked={isChecked}
                              tabIndex={0}
                              onClick={createOptionToggleHandler(filter.key, opt.value)}
                              onKeyDown={(e) => {
                                if (e.key === ' ' || e.key === 'Enter') {
                                  e.preventDefault()
                                  onFilterChange(filter.key, opt.value)
                                }
                              }}
                              className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-colors ${
                                isChecked
                                  ? 'border-border-brand bg-background-brand_solid text-static-white'
                                  : 'border-border-primary bg-background-primary'
                              }`}
                            >
                              {isChecked && <Check className="h-3 w-3" strokeWidth={3} />}
                            </span>
                            <span className="text-sm text-text-primary">{opt.label}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex shrink-0 items-center justify-between border-t border-border-secondary px-5 py-4">
              <Button onClick={handleClearAll} size="sm" variant="ghost">Clear all</Button>
              <Button onClick={handleClose} size="sm" variant="primary">Done</Button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
