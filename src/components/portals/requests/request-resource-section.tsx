import type { ReactNode } from 'react'
import { SelectionCard } from '@/components/ui/selection-card'

interface RequestResourceSectionProps<T> {
  title: string
  description: string
  items: T[]
  selectedIds: string[]
  emptyMessage: string
  onToggle: (id: string) => void
  getId: (item: T) => string
  getTitle: (item: T) => string
  getDescription: (item: T) => string
  getMeta?: (item: T) => ReactNode
  isDisabled?: (item: T) => boolean
}

interface RequestResourceOptionProps<T> {
  item: T
  selectedIds: string[]
  onToggle: (id: string) => void
  getId: (item: T) => string
  getTitle: (item: T) => string
  getDescription: (item: T) => string
  getMeta?: (item: T) => ReactNode
  isDisabled?: (item: T) => boolean
}

function RequestResourceOption<T>({ item, selectedIds, onToggle, getId, getTitle, getDescription, getMeta, isDisabled }: RequestResourceOptionProps<T>) {
  const id = getId(item)
  const selected = selectedIds.includes(id)
  const disabled = isDisabled?.(item) ?? false

  function handleClick() {
    onToggle(id)
  }

  return (
    <SelectionCard
      selected={selected}
      title={getTitle(item)}
      description={getDescription(item)}
      meta={getMeta?.(item)}
      onClick={handleClick}
      disabled={disabled}
      className={disabled ? 'cursor-not-allowed opacity-60' : ''}
    />
  )
}

export function RequestResourceSection<T>({ title, description, items, selectedIds, emptyMessage, onToggle, getId, getTitle, getDescription, getMeta, isDisabled }: RequestResourceSectionProps<T>) {
  return (
    <section className="space-y-3">
      <div>
        <h4 className="text-sm font-semibold text-text-primary">{title}</h4>
        <p className="mt-1 text-sm text-text-tertiary">{description}</p>
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-secondary px-4 py-6 text-sm text-text-tertiary">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {items.map((item) => (
            <RequestResourceOption
              key={getId(item)}
              item={item}
              selectedIds={selectedIds}
              onToggle={onToggle}
              getId={getId}
              getTitle={getTitle}
              getDescription={getDescription}
              getMeta={getMeta}
              isDisabled={isDisabled}
            />
          ))}
        </div>
      )}
    </section>
  )
}
