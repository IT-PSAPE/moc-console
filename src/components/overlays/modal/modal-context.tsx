import { createContext, useContext } from 'react'

export type ModalContextValue = {
    state: {
        isOpen: boolean
        isTopmost: boolean
        zIndex: number
    }
    actions: {
        close: () => void
        open: () => void
        setOpen: (nextOpen: boolean) => void
    }
    meta: {
        closeOnBackdropClick: boolean
        descriptionId?: string
        setDescriptionId: (id?: string) => void
        setTitleId: (id?: string) => void
        titleId?: string
    }
}

const ModalContext = createContext<ModalContextValue | null>(null)

export function ModalProvider({ children, value }: { children: React.ReactNode, value: ModalContextValue }) {
    return (
        <ModalContext.Provider value={value}>
            {children}
        </ModalContext.Provider>
    )
}

export function useModal() {
    const context = useContext(ModalContext)

    if (!context) {
        throw new Error('useModal must be used within a Modal.Root')
    }

    return context
}
