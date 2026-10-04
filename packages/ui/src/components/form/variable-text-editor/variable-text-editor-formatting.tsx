import { RichTextEditor } from '../rich-text-editor'
import { useVariableTextEditorContext } from './variable-text-editor-context'

export function VariableTextEditorFormatting() {
    const { state, meta } = useVariableTextEditorContext()
    if (state.view !== 'editor' || meta.richFallback) return null
    return <div className="ml-auto flex w-full flex-wrap items-center justify-start gap-1 sm:w-auto sm:justify-end"><RichTextEditor.Controls /></div>
}
