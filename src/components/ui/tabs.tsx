import { createContext, useContext, useId, useState, type KeyboardEvent, type ReactNode } from 'react'

interface TabsState {
  activeTab: string
}

interface TabsActions {
  setActiveTab: (id: string) => void
}

interface TabsContextValue {
  state: TabsState
  actions: TabsActions
  meta: {
    baseId: string
  }
}

interface TabsRootProps {
  children: ReactNode
  defaultTab?: string
  defaultValue?: string
  onValueChange?: (id: string) => void
  value?: string
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('Tabs compound components must be used within Tabs.Root')
  return ctx
}

function focusTabSibling(currentTarget: HTMLButtonElement, direction: 'next' | 'previous' | 'first' | 'last') {
  const tabs = Array.from(currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])

  if (tabs.length === 0) return null

  if (direction === 'first') {
    tabs[0]?.focus()
    return tabs[0] ?? null
  }

  if (direction === 'last') {
    tabs[tabs.length - 1]?.focus()
    return tabs[tabs.length - 1] ?? null
  }

  const currentIndex = tabs.indexOf(currentTarget)
  const delta = direction === 'next' ? 1 : -1
  const nextIndex = (currentIndex + delta + tabs.length) % tabs.length
  tabs[nextIndex]?.focus()
  return tabs[nextIndex] ?? null
}

function Root({ children, defaultTab, defaultValue, onValueChange, value }: TabsRootProps) {
  const initialValue = defaultValue ?? defaultTab ?? ''
  const [internalValue, setInternalValue] = useState(initialValue)
  const activeTab = value ?? internalValue
  const baseId = useId()

  function setActiveTab(id: string) {
    if (value == null) {
      setInternalValue(id)
    }

    onValueChange?.(id)
  }

  return (
    <TabsContext.Provider value={{
      state: { activeTab },
      actions: { setActiveTab },
      meta: { baseId },
    }}>
      {children}
    </TabsContext.Provider>
  )
}

function List({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto border-b border-border-secondary">
      <div aria-orientation="horizontal" className="flex min-w-max gap-1 pb-px" role="tablist">
        {children}
      </div>
    </div>
  )
}

function Trigger({ id, children }: { id: string; children: ReactNode }) {
  const { state: { activeTab }, actions: { setActiveTab }, meta: { baseId } } = useTabsContext()
  const active = activeTab === id

  function handleClick() {
    setActiveTab(id)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    let nextButton: HTMLButtonElement | null = null

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault()
      nextButton = focusTabSibling(event.currentTarget, 'next')
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault()
      nextButton = focusTabSibling(event.currentTarget, 'previous')
    }

    if (event.key === 'Home') {
      event.preventDefault()
      nextButton = focusTabSibling(event.currentTarget, 'first')
    }

    if (event.key === 'End') {
      event.preventDefault()
      nextButton = focusTabSibling(event.currentTarget, 'last')
    }

    const nextTabId = nextButton?.dataset.tabId
    if (nextTabId) {
      setActiveTab(nextTabId)
    }
  }

  return (
    <button
      aria-controls={`${baseId}-panel-${id}`}
      aria-selected={active}
      data-tab-id={id}
      id={`${baseId}-tab-${id}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? 'border-b-2 border-border-brand text-foreground-brand_primary'
          : 'text-text-tertiary hover:text-text-secondary'
      }`}
      role="tab"
      tabIndex={active ? 0 : -1}
      type="button"
    >
      {children}
    </button>
  )
}

function Content({ id, children }: { id: string; children: ReactNode }) {
  const { state: { activeTab }, meta: { baseId } } = useTabsContext()
  const hidden = activeTab !== id

  return (
    <div
      aria-labelledby={`${baseId}-tab-${id}`}
      className="pt-4"
      hidden={hidden}
      id={`${baseId}-panel-${id}`}
      role="tabpanel"
      tabIndex={0}
    >
      {children}
    </div>
  )
}

export const Tabs = { Root, List, Trigger, Content }
