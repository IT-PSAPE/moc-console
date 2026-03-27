import { createContext, useContext, useId, type KeyboardEvent, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

interface SegmentedControlState {
  activeValue: string
}

interface SegmentedControlActions {
  setValue: (value: string) => void
}

interface SegmentedControlMeta {
  baseId: string
}

interface SegmentedControlContextValue {
  state: SegmentedControlState
  actions: SegmentedControlActions
  meta: SegmentedControlMeta
}

interface SegmentedControlRootProps {
  value: string
  onChange: (value: string) => void
  children: ReactNode
  ariaLabel: string
}

interface SegmentedControlOptionProps {
  value: string
  label: string
  icon?: LucideIcon
}

const SegmentedControlContext = createContext<SegmentedControlContextValue | null>(null)

function useSegmentedControlContext() {
  const context = useContext(SegmentedControlContext)
  if (!context) throw new Error('SegmentedControl compounds must be used within SegmentedControl.Root')
  return context
}

function focusSibling(currentTarget: HTMLButtonElement, direction: 'next' | 'previous') {
  const buttons = Array.from(
    currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[data-segmented-control-option="true"]') ?? [],
  )

  if (buttons.length === 0) return null

  const currentIndex = buttons.indexOf(currentTarget)
  const delta = direction === 'next' ? 1 : -1
  const nextIndex = (currentIndex + delta + buttons.length) % buttons.length
  buttons[nextIndex]?.focus()
  return buttons[nextIndex] ?? null
}

function Root({ value, onChange, children, ariaLabel }: SegmentedControlRootProps) {
  const baseId = useId()

  return (
    <SegmentedControlContext.Provider
      value={{
        state: { activeValue: value },
        actions: { setValue: onChange },
        meta: { baseId },
      }}
    >
      <div
        aria-label={ariaLabel}
        className="flex w-full flex-wrap items-center gap-1 rounded-xl border border-border-primary bg-background-secondary p-1 sm:w-auto sm:flex-nowrap"
        role="toolbar"
      >
        {children}
      </div>
    </SegmentedControlContext.Provider>
  )
}

function Option({ value, label, icon: Icon }: SegmentedControlOptionProps) {
  const { state: { activeValue }, actions: { setValue }, meta: { baseId } } = useSegmentedControlContext()
  const active = activeValue === value

  function handleClick() {
    setValue(value)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    let nextButton: HTMLButtonElement | null = null

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      nextButton = focusSibling(event.currentTarget, 'next')
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      nextButton = focusSibling(event.currentTarget, 'previous')
    }

    const nextValue = nextButton?.dataset.segmentedValue
    if (nextValue) {
      setValue(nextValue)
    }
  }

  return (
    <button
      aria-pressed={active}
      className={cn(
        'flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:flex-none',
        active ? 'bg-background-primary text-text-primary shadow-sm' : 'text-text-tertiary hover:text-text-secondary',
      )}
      data-segmented-control-option="true"
      data-segmented-value={value}
      id={`${baseId}-${value}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      type="button"
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span>{label}</span>
    </button>
  )
}

export const SegmentedControl = { Root, Option }
