import { createContext, useContext, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface InfoListContextValue {
  meta: {
    withIcons: boolean
  }
}

const InfoListContext = createContext<InfoListContextValue | null>(null)

function useInfoListContext() {
  const context = useContext(InfoListContext)
  if (!context) {
    throw new Error('InfoList compound components must be used within InfoList.Root')
  }
  return context
}

function Root({ children, className = '', withIcons = false }: { children: ReactNode; className?: string; withIcons?: boolean }) {
  return (
    <InfoListContext.Provider value={{ meta: { withIcons } }}>
      <div className={cn('space-y-2', className)}>{children}</div>
    </InfoListContext.Provider>
  )
}

function Item({ children }: { children: ReactNode }) {
  const { meta: { withIcons } } = useInfoListContext()
  return (
    <div className={cn('flex gap-3 py-1.5', withIcons ? 'items-start' : 'items-center')}>
      {children}
    </div>
  )
}

function Icon({ children }: { children: ReactNode }) {
  useInfoListContext()
  return <span className="pt-0.5 text-text-quaternary">{children}</span>
}

function Label({ children }: { children: ReactNode }) {
  useInfoListContext()
  return <span className="w-28 shrink-0 text-sm text-text-secondary">{children}</span>
}

function Value({ children }: { children: ReactNode }) {
  useInfoListContext()
  return <div className="min-w-0 flex-1 text-sm text-text-primary">{children}</div>
}

export const InfoList = { Root, Item, Icon, Label, Value }
