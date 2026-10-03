import { VariableTextEditorContext, type VariableTextEditorProps } from './variable-text-editor-context'
import { useVariableTextEditor } from './use-variable-text-editor'

export function VariableTextEditorRoot({ children, ...meta }: VariableTextEditorProps) {
    const value = useVariableTextEditor(meta)
    return <VariableTextEditorContext value={value}>{children}</VariableTextEditorContext>
}
