import { RichTextEditor } from '@moc/ui/components/form/rich-text-editor'
import { useScheduledMessageBodyContext } from './scheduled-message-body-context'

export function ScheduledMessageBodyEditorView() {
    const { state } = useScheduledMessageBodyContext()
    if (state.view !== 'editor') return null
    return <RichTextEditor.Content aria-label="Message body" />
}
