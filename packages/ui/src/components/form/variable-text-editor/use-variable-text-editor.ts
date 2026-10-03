import { useState } from 'react'
import type { VariableTextEditorProps } from './variable-text-editor-context'

export function useVariableTextEditor(meta: Omit<VariableTextEditorProps, 'children'>) {
    const [view, changeView] = useState('editor')
    return { state: { view }, actions: { changeView }, meta }
}
