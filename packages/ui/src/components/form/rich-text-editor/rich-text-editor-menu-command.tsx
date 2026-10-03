import { Dropdown } from '../../overlays/dropdown'
import { useRichTextEditorContext } from './rich-text-editor-context'
import type { RichTextCommand } from './use-rich-text-editor'
export function RichTextEditorMenuCommand({ command, children }: { command: RichTextCommand; children: string }) {
    const { state, actions } = useRichTextEditorContext()
    function execute(): void { actions.command(command) }
    return <Dropdown.Item onSelect={execute} disabled={state.disabled || state.selection?.disabledCommands.includes(command)}>{children}</Dropdown.Item>
}
