import { createContext, useContext } from 'react'
import type { useRichTextEditor } from './use-rich-text-editor'
export const RichTextEditorContext = createContext<ReturnType<typeof useRichTextEditor> | null>(null)
export function useRichTextEditorContext() {
    const context = useContext(RichTextEditorContext)
    if (!context) throw new Error('Rich text controls must be inside RichTextEditor.Root')
    return context
}
