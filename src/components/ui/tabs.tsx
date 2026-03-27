import { createContext, useContext, useState, type ReactNode } from 'react'

interface TabsState {
  activeTab: string
}

interface TabsActions {
  setActiveTab: (id: string) => void
}

interface TabsContextValue {
  state: TabsState
  actions: TabsActions
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('Tabs compound components must be used within Tabs.Root')
  return ctx
}

function Root({ defaultTab, children }: { defaultTab: string; children: ReactNode }) {
  const [activeTab, setActiveTab] = useState(defaultTab)

  return (
    <TabsContext.Provider value={{ state: { activeTab }, actions: { setActiveTab } }}>
      {children}
    </TabsContext.Provider>
  )
}

function List({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto border-b border-border-secondary">
      <div className="flex min-w-max gap-1 pb-px">
        {children}
      </div>
    </div>
  )
}

function Trigger({ id, children }: { id: string; children: ReactNode }) {
  const { state: { activeTab }, actions: { setActiveTab } } = useTabsContext()
  const active = activeTab === id

  function handleClick() {
    setActiveTab(id)
  }

  return (
    <button
      onClick={handleClick}
      className={`px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? 'border-b-2 border-border-brand text-foreground-brand_primary'
          : 'text-text-tertiary hover:text-text-secondary'
      }`}
    >
      {children}
    </button>
  )
}

function Content({ id, children }: { id: string; children: ReactNode }) {
  const { state: { activeTab } } = useTabsContext()
  if (activeTab !== id) return null
  return <div className="pt-4">{children}</div>
}

export const Tabs = { Root, List, Trigger, Content }
