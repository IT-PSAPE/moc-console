import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void): () => void {
    document.addEventListener('fullscreenchange', onChange)
    return function unsubscribe(): void {
        document.removeEventListener('fullscreenchange', onChange)
    }
}

function getFullscreenElement(): HTMLElement | null {
    return document.fullscreenElement instanceof HTMLElement ? document.fullscreenElement : null
}

function getServerSnapshot(): null { return null }

export function useFullscreenElement(): HTMLElement | null {
    return useSyncExternalStore(subscribe, getFullscreenElement, getServerSnapshot)
}
