import { VariableTextEditorContext, type VariableTextEditorProps } from './variable-text-editor-context'
import { useVariableTextEditor } from './use-variable-text-editor'
import { RichTextEditor } from '../rich-text-editor'

export function VariableTextEditorRoot({ children, ...meta }: VariableTextEditorProps) {
    const value = useVariableTextEditor(meta)
    return <VariableTextEditorContext value={value}><RichTextEditor.Root value={meta.html} onChange={meta.onRichChange} disabled={meta.disabled}><div className="flex min-w-0 flex-col">{children}</div></RichTextEditor.Root></VariableTextEditorContext>
}
