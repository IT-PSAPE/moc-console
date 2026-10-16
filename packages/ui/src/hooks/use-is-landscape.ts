import { useSyncExternalStore } from 'react'

const LANDSCAPE_BREAKPOINT = 768

function subscribe(callback: () => void): () => void {
    const mql = window.matchMedia(`(width < ${LANDSCAPE_BREAKPOINT}px)`)
    mql.addEventListener('change', callback)
    return () => mql.removeEventListener('change', callback)
}

function getSnapshot(): boolean {
    return window.innerWidth < LANDSCAPE_BREAKPOINT
}

function getServerSnapshot(): boolean {
    return false
}

export function useIsLandscape(): boolean {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
