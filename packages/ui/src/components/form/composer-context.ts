import { createContext, useContext } from 'react'
import type { useComposer } from '../../hooks/use-composer'

export const ComposerContext = createContext<ReturnType<typeof useComposer> | null>(null)

export function useComposerContext(): ReturnType<typeof useComposer> {
    const context = useContext(ComposerContext)
    if (!context) throw new Error('Composer components must be used inside Composer.Root.')
    return context
}
