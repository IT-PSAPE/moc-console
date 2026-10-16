import { RichTextEditor } from '../rich-text-editor'
import { useVariableTextEditorContext } from './variable-text-editor-context'

export function VariableTextEditorFormatting() {
    const { state, meta } = useVariableTextEditorContext()
    if (state.view !== 'editor' || meta.richFallback) return null
    return <div className="ml-auto flex w-auto portrait:w-full flex-wrap items-center justify-end portrait:justify-start gap-1"><RichTextEditor.Controls /></div>
}
