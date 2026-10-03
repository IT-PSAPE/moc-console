import { useMemo, useRef, type ChangeEvent, type MouseEvent } from 'react'
import { editorHtmlToTemplate, templateToEditorHtml, unsupportedTemplateTags } from '@/lib/template-editor-html'

export function useTemplateBodyEditor(body: string, onChange: (body: string) => void) {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const editorHtml = useMemo(() => templateToEditorHtml(body), [body])
    const unsupportedTags = useMemo(() => unsupportedTemplateTags(body), [body])
    function changeBody(event: ChangeEvent<HTMLTextAreaElement>): void { onChange(event.target.value) }
    function changeRichBody(html: string): void { onChange(editorHtmlToTemplate(html)) }
    function insertTokenFromButton(event: MouseEvent<HTMLButtonElement>): void {
        const name = event.currentTarget.dataset.token
        if (!name) return
        const token = `{{${name}}}`
        const element = textareaRef.current
        const start = element?.selectionStart ?? body.length
        const end = element?.selectionEnd ?? body.length
        onChange(body.slice(0, start) + token + body.slice(end))
        requestAnimationFrame(() => { element?.focus(); element?.setSelectionRange(start + token.length, start + token.length) })
    }
    return { state: { editorHtml, unsupportedTags }, actions: { changeBody, changeRichBody, insertTokenFromButton }, meta: { textareaRef } }
}
