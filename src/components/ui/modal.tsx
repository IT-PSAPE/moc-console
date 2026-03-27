import { createContext, useContext, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalActions {
  onClose: () => void
}

interface ModalContextValue {
  actions: ModalActions
}

const ModalContext = createContext<ModalContextValue | null>(null)

function useModalContext() {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error('Modal compound components must be used within Modal.Root')
  return ctx
}

function Root({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null

  return (
    <ModalContext.Provider value={{ actions: { onClose } }}>
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
        <div className="fixed inset-0 bg-background-overlay/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 flex max-h-[90dvh] w-full flex-col rounded-t-2xl border border-border-primary bg-background-primary shadow-2xl sm:max-w-lg sm:rounded-xl">
          {children}
        </div>
      </div>
    </ModalContext.Provider>
  )
}

function Header({ children }: { children: ReactNode }) {
  const { actions: { onClose } } = useModalContext()

  return (
    <div className="flex shrink-0 items-center justify-between border-b border-border-secondary px-6 py-4">
      <h3 className="text-lg font-semibold text-text-primary">{children}</h3>
      <button
        onClick={onClose}
        className="rounded-lg p-1 text-text-tertiary hover:bg-background-secondary_hover hover:text-text-secondary"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  )
}

function Body({ children }: { children: ReactNode }) {
  return <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
}

function Footer({ children }: { children: ReactNode }) {
  return (
    <div className="flex shrink-0 items-center justify-end gap-3 border-t border-border-secondary px-6 py-4">
      {children}
    </div>
  )
}

export const Modal = { Root, Header, Body, Footer }
