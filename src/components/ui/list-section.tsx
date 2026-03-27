import { createContext, useContext, type ReactNode } from 'react'

const ListSectionContext = createContext<boolean>(false)

function useListSectionContext() {
  const context = useContext(ListSectionContext)
  if (!context) {
    throw new Error('ListSection compound components must be used within ListSection.Root')
  }
}

function Root({ children }: { children: ReactNode }) {
  return (
    <ListSectionContext.Provider value={true}>
      <section className="space-y-2">{children}</section>
    </ListSectionContext.Provider>
  )
}

function Header({ children }: { children: ReactNode }) {
  useListSectionContext()
  return <h4 className="text-xs font-medium uppercase tracking-[0.16em] text-text-quaternary">{children}</h4>
}

function Items({ children }: { children: ReactNode }) {
  useListSectionContext()
  return <div className="space-y-1.5">{children}</div>
}

function Item({ children }: { children: ReactNode }) {
  useListSectionContext()
  return <div className="rounded-lg border border-border-secondary bg-background-secondary px-3 py-2 text-sm text-text-primary">{children}</div>
}

function Empty({ description, title }: { description: string; title: string }) {
  useListSectionContext()
  return (
    <div className="rounded-lg border border-border-secondary bg-background-secondary px-4 py-3">
      <p className="text-sm font-medium text-text-primary">{title}</p>
      <p className="text-xs text-text-tertiary">{description}</p>
    </div>
  )
}

export const ListSection = { Root, Header, Items, Item, Empty }
