import { Label } from '../../display/text'
import { RichTextEditor } from '../rich-text-editor'
import { useVariableTextEditorContext } from './variable-text-editor-context'

export function VariableTextEditorRich() {
    const { state, meta } = useVariableTextEditorContext()
    function renderVariable(name: string) {
        return <RichTextEditor.Variable key={name} name={name} />
    }
    if (state.view !== 'editor') return null
    if (meta.richFallback) return meta.richFallback
    return <RichTextEditor.Root value={meta.html} onChange={meta.onRichChange} disabled={meta.disabled}>
        <div><RichTextEditor.Toolbar /><RichTextEditor.Content /></div>
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Insert a variable">
            <Label.xs className="mr-1 text-tertiary">Insert variable</Label.xs>
            {meta.variables.map(renderVariable)}
        </div>
    </RichTextEditor.Root>
}
