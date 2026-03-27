import { createContext, useContext, useId, type ReactNode, type RefObject } from 'react'
import { X } from 'lucide-react'
import { useOverlayBehavior } from '@/hooks/use-overlay-behavior'
import { IconButton } from '@/components/ui/icon-button'

interface ModalActions {
  onClose: () => void
}

interface ModalMeta {
  closeButtonRef: RefObject<HTMLButtonElement | null>
  titleId: string
}

interface ModalContextValue {
  actions: ModalActions
  meta: ModalMeta
}

const ModalContext = createContext<ModalContextValue | null>(null)

function useModalContext() {
  const ctx = useContext(ModalContext)
  if (!ctx) throw new Error('Modal compound components must be used within Modal.Root')
  return ctx
}

function Root({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const titleId = useId()
  const { panelRef, closeButtonRef } = useOverlayBehavior({ open, onClose })

  if (!open) return null

  return (
    <ModalContext.Provider value={{ actions: { onClose }, meta: { closeButtonRef, titleId } }}>
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
        <div aria-hidden="true" className="fixed inset-0 bg-background-overlay/60 backdrop-blur-sm" onClick={onClose} />
        <div
          aria-labelledby={titleId}
          aria-modal="true"
          className="relative z-10 flex max-h-[90dvh] w-full flex-col rounded-t-2xl border border-border-primary bg-background-primary shadow-2xl sm:max-w-lg sm:rounded-xl"
          ref={panelRef}
          role="dialog"
          tabIndex={-1}
        >
          {children}
        </div>
      </div>
    </ModalContext.Provider>
  )
}

function Header({ children }: { children: ReactNode }) {
  const { actions: { onClose }, meta: { closeButtonRef, titleId } } = useModalContext()

  return (
    <div className="flex shrink-0 items-center justify-between border-b border-border-secondary px-6 py-4">
      <h2 className="text-lg font-semibold text-text-primary" id={titleId}>{children}</h2>
      <IconButton
        icon={<X className="h-5 w-5" />}
        label="Close dialog"
        onClick={onClose}
        ref={closeButtonRef}
      />
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
