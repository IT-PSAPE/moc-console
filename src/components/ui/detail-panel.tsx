import { createContext, useContext, useId, type ReactNode, type RefObject } from 'react'
import { X } from 'lucide-react'
import { IconButton } from '@/components/ui/icon-button'
import { useOverlayBehavior } from '@/hooks/use-overlay-behavior'

interface PanelActions {
  onClose: () => void
}

interface PanelMeta {
  closeButtonRef: RefObject<HTMLButtonElement | null>
  titleId: string
}

interface PanelContextValue {
  actions: PanelActions
  meta: PanelMeta
}

const PanelContext = createContext<PanelContextValue | null>(null)

function usePanelContext() {
  const ctx = useContext(PanelContext)
  if (!ctx) throw new Error('DetailPanel compound components must be used within DetailPanel.Root')
  return ctx
}

function Root({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const titleId = useId()
  const { panelRef, closeButtonRef } = useOverlayBehavior({ open, onClose })

  if (!open) return null

  return (
    <PanelContext.Provider value={{ actions: { onClose }, meta: { closeButtonRef, titleId } }}>
      <div className="fixed inset-0 z-50 flex justify-end">
        <div aria-hidden="true" className="fixed inset-0 bg-background-overlay/50" onClick={onClose} />
        <div
          aria-labelledby={titleId}
          aria-modal="true"
          className="relative z-10 flex h-full w-full flex-col border-l border-border-primary bg-background-primary shadow-2xl sm:max-w-xl"
          ref={panelRef}
          role="dialog"
          tabIndex={-1}
        >
          {children}
        </div>
      </div>
    </PanelContext.Provider>
  )
}

function Header({ children, actions }: { children?: ReactNode; actions?: ReactNode }) {
  const { actions: { onClose }, meta: { closeButtonRef, titleId } } = usePanelContext()

  return (
    <div className="flex items-center justify-between border-b border-border-secondary px-6 py-3">
      <div className="flex items-center gap-1">
        {actions}
        {children && <h2 className="text-lg font-semibold text-text-primary" id={titleId}>{children}</h2>}
      </div>
      <IconButton
        icon={<X className="h-5 w-5" />}
        label="Close panel"
        onClick={onClose}
        ref={closeButtonRef}
      />
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
