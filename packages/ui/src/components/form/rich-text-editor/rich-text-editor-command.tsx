import type { ReactNode } from 'react'
import { Button } from '../../controls/button'
import { useRichTextEditorContext } from './rich-text-editor-context'
import type { RichTextCommand } from './use-rich-text-editor'
export function RichTextEditorCommand({ command, label, icon }: { command: RichTextCommand; label: string; icon: ReactNode }) {
    const { state, actions } = useRichTextEditorContext()
    function execute(): void { actions.command(command) }
    const active = state.selection?.activeCommands.includes(command) ?? false
    return <Button.Icon variant="ghost" aria-label={label} title={label} aria-pressed={active} icon={icon} onClick={execute} onMouseDown={actions.preserveSelection} disabled={state.disabled || !state.editor} className={active ? 'bg-tertiary text-brand' : undefined} />
}
