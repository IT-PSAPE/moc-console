import { useMemo } from 'react'
import { editorHtmlToMessageBody, messageBodyToEditorHtml } from '@/lib/message-editor-html'

export type MessageBodyEditor = {
    state: { editorHtml: string }
    actions: { changeRichBody: (html: string) => void }
}

export function useMessageBodyEditor(body: string, onChange: (body: string) => void): MessageBodyEditor {
    const editorHtml = useMemo(() => messageBodyToEditorHtml(body), [body])

    function changeRichBody(html: string): void {
        onChange(editorHtmlToMessageBody(html))
    }

    return { state: { editorHtml }, actions: { changeRichBody } }
}
