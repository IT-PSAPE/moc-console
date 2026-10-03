import { createContext, useContext, type ChangeEvent, type MouseEvent, type ReactNode, type RefObject } from 'react'

export type VariableTextEditorProps = {
    children: ReactNode
    source: string
    html: string
    variables: string[]
    disabled?: boolean
    richFallback?: ReactNode
    textareaRef: RefObject<HTMLTextAreaElement | null>
    onSourceChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
    onRichChange: (html: string) => void
    onInsertVariable: (event: MouseEvent<HTMLButtonElement>) => void
}
export const VariableTextEditorContext = createContext<{
    state: { view: string }
    actions: { changeView: (view: string) => void }
    meta: Omit<VariableTextEditorProps, 'children'>
} | null>(null)

export function useVariableTextEditorContext() {
    const value = useContext(VariableTextEditorContext)
    if (!value) throw new Error('VariableTextEditor.Root is required')
    return value
}
