import { createContext, useContext, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface PanelActions {
  onClose: () => void
}

interface PanelContextValue {
  actions: PanelActions
}

const PanelContext = createContext<PanelContextValue | null>(null)

function usePanelContext() {
  const ctx = useContext(PanelContext)
  if (!ctx) throw new Error('DetailPanel compound components must be used within DetailPanel.Root')
  return ctx
}

function Root({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null

  return (
    <PanelContext.Provider value={{ actions: { onClose } }}>
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="fixed inset-0 bg-background-overlay/50" onClick={onClose} />
        <div className="relative z-10 flex h-full w-full flex-col border-l border-border-primary bg-background-primary shadow-2xl sm:max-w-xl">
          {children}
        </div>
      </div>
    </PanelContext.Provider>
  )
}

function Header({ children, actions }: { children?: ReactNode; actions?: ReactNode }) {
  const { actions: { onClose } } = usePanelContext()

  return (
    <div className="flex items-center justify-between border-b border-border-secondary px-6 py-3">
      <div className="flex items-center gap-1">
        {actions}
        {children && <h3 className="text-lg font-semibold text-text-primary">{children}</h3>}
      </div>
      <button
        onClick={onClose}
        className="rounded-lg p-1 text-text-tertiary hover:bg-background-secondary_hover hover:text-text-secondary"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  )
}

function Body({ children }: { children: ReactNode }) {
  return <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-6">
      <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-text-quaternary">{label}</h4>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <dt className="text-xs text-text-quaternary">{label}</dt>
      <dd className="mt-0.5 text-sm text-text-primary">{children}</dd>
    </div>
  )
}

function Footer({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-border-secondary px-6 py-4">
      {children}
    </div>
  )
}

export const DetailPanel = { Root, Header, Body, Section, Field, Footer }
