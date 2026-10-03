import { Button } from '../../controls/button'
import { Label } from '../../display/text'
import { TextArea } from '../text-area'
import { useVariableTextEditorContext } from './variable-text-editor-context'

export function VariableTextEditorSource() {
    const { state, meta } = useVariableTextEditorContext()
    const { textareaRef, source, onSourceChange, disabled, variables, onInsertVariable } = meta
    function renderVariable(name: string) {
        return <Button.Unstyled key={name} data-token={name} disabled={disabled} onClick={onInsertVariable} title={`Insert ${name}`} className="cursor-pointer rounded bg-secondary px-2 py-1 font-mono text-secondary hover:bg-tertiary focus-visible:outline-2 focus-visible:outline-offset-2"><Label.xs className="text-inherit">{`{{${name}}}`}</Label.xs></Button.Unstyled>
    }
    if (state.view !== 'source') return null
    return <>
        <TextArea aria-label="Message template source" ref={textareaRef} value={source} onChange={onSourceChange} disabled={disabled} rows={12} className="font-mono" />
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Insert a variable"><Label.xs className="mr-1 text-tertiary">Insert variable</Label.xs>{variables.map(renderVariable)}</div>
    </>
}
