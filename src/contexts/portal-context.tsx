import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { PortalConfig } from '@/types'
import { getPortals } from '@/lib/portal-registry'

interface PortalState {
  portals: PortalConfig[]
}

interface PortalContextValue {
  state: PortalState
}

const PortalContext = createContext<PortalContextValue | null>(null)

export function PortalProvider({ children }: { children: ReactNode }) {
  const portals = useMemo(() => getPortals(), [])

  return (
    <PortalContext.Provider value={{ state: { portals } }}>
      {children}
    </PortalContext.Provider>
  )
}

export function usePortals() {
  const ctx = useContext(PortalContext)
  if (!ctx) throw new Error('usePortals must be used within PortalProvider')
  return ctx
}
