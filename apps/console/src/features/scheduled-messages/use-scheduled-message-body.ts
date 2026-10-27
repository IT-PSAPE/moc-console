import { useState } from 'react'
import { useMessageBodyEditor } from '@/hooks/use-message-body-editor'
import type { ScheduledMessagePreview } from './scheduled-message-preview'
import type { ScheduledMessageBodyContextValue } from './components/scheduled-message-body-context'

export function useScheduledMessageBody(body: string, onChange: (body: string) => void, primaryPreview: ScheduledMessagePreview, followUpPreview: ScheduledMessagePreview | null, timezone: string): ScheduledMessageBodyContextValue {
    const [view, setView] = useState<'editor' | 'preview'>('editor')
    const editor = useMessageBodyEditor(body, onChange)

    function changeView(value: string): void {
        if (value === 'editor' || value === 'preview') setView(value)
    }

    return {
        state: { view, editorHtml: editor.state.editorHtml, primaryPreview, followUpPreview },
        actions: { changeView, changeRichBody: editor.actions.changeRichBody },
        meta: { timezone },
    }
}
