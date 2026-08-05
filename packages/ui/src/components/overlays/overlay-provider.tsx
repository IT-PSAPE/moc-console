import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

const OVERLAY_ROOT_ID = 'overlay-root'
const OVERLAY_BASE_Z_INDEX = 1

type OverlayStackContextValue = {
    state: {
        rootElement: HTMLElement | null
    }
    actions: Record<string, never>
    meta: {
        baseZIndex: number
    }
}

const OverlayStackContext = createContext<OverlayStackContextValue | null>(null)
const EMPTY_ACTIONS: Record<string, never> = {}

function ensureOverlayRoot() {
    const existingRoot = document.getElementById(OVERLAY_ROOT_ID)

    if (existingRoot) {
        return existingRoot
    }

    const nextRoot = document.createElement('div')
    nextRoot.id = OVERLAY_ROOT_ID
    document.body.append(nextRoot)

    return nextRoot
}

export function OverlayProvider({ children }: { children: ReactNode }) {
    const [rootElement] = useState<HTMLElement | null>(() => {
        if (typeof document === 'undefined') {
            return null
        }

        return ensureOverlayRoot()
    })
    const state = useMemo<OverlayStackContextValue['state']>(() => ({
        rootElement,
    }), [rootElement])

    const meta = useMemo<OverlayStackContextValue['meta']>(() => ({
        baseZIndex: OVERLAY_BASE_Z_INDEX,
    }), [])

    const value = useMemo<OverlayStackContextValue>(() => ({
        state,
        actions: EMPTY_ACTIONS,
        meta,
    }), [meta, state])

    return (
        <OverlayStackContext.Provider value={value}>
            {children}
        </OverlayStackContext.Provider>
    )
}

export function useOverlayStack() {
    const context = useContext(OverlayStackContext)

    if (!context) {
        throw new Error('useOverlayStack must be used within an OverlayProvider')
    }

    return context
}
