import { createContext, useContext, type ReactNode } from 'react'
import { useOverview } from './use-overview'

const Context = createContext<ReturnType<typeof useOverview> | null>(null)

export function OverviewRoot({ children }: { children: ReactNode }) {
  const value = useOverview()
  return <Context value={value}>{children}</Context>
}

export function useOverviewContext(): ReturnType<typeof useOverview> {
  const context = useContext(Context)
  if (!context) throw new Error('Overview.Root is required')
  return context
}
