import { Button } from '../../controls/button'
import { Label } from '../../display/text'
import { useRichTextEditorContext } from './rich-text-editor-context'
export function RichTextEditorVariable({ name }: { name: string }) {
    const { state, actions } = useRichTextEditorContext()
    function insert(): void { actions.insertVariable(name) }
    return <Button.Unstyled type="button" title={`Insert ${name}`} onClick={insert} onMouseDown={actions.preserveSelection} disabled={state.disabled} className="cursor-pointer rounded bg-secondary px-2 text-secondary hover:bg-tertiary focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed"><Label.xs className="text-inherit">{name}</Label.xs></Button.Unstyled>
}
