import { RichTextEditor } from '@moc/ui/components/form/rich-text-editor'
import { ScheduledMessageBodyViewSwitch } from './scheduled-message-body-view-switch'
import { useScheduledMessageBodyContext } from './scheduled-message-body-context'
import { ScheduledMessageBodyEditorView } from './scheduled-message-body-editor-view'
import { ScheduledMessageBodyPreviewView } from './scheduled-message-body-preview-view'

export function ScheduledMessageBodyEditor() {
    const { state, actions, meta } = useScheduledMessageBodyContext()
    return <RichTextEditor.Root value={state.editorHtml} onChange={actions.changeRichBody} dateTimeTimeZone={meta.timezone}>
        <RichTextEditor.Toolbar className="items-center">
            <RichTextEditor.Controls />
            <ScheduledMessageBodyViewSwitch />
        </RichTextEditor.Toolbar>
        <RichTextEditor.DateTime />
        <ScheduledMessageBodyEditorView />
        <ScheduledMessageBodyPreviewView />
    </RichTextEditor.Root>
}
