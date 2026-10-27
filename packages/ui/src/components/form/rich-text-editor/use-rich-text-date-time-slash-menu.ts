import { useEffect } from 'react'
import { useEditorState } from '@tiptap/react'
import type { MouseEvent } from 'react'
import { currentRichTextDateTimeValue, filterRichTextDateTimeSlashCommands, type RichTextDateTimeKind } from './rich-text-date-time'
import { useRichTextEditorContext } from './rich-text-editor-context'
import { inactiveRichTextDateTimeSlashState, richTextDateTimeSlashKey } from './rich-text-date-time-slash'

function selectedIndexFromEvent(event: MouseEvent<HTMLButtonElement>): number | null {
    const index = Number(event.currentTarget.dataset.index)
    return Number.isInteger(index) && index >= 0 ? index : null
}

function kindFromEvent(event: MouseEvent<HTMLButtonElement>): RichTextDateTimeKind | null {
    const kind = event.currentTarget.dataset.kind
    return kind === 'date' || kind === 'time' ? kind : null
}

export function useRichTextDateTimeSlashMenu() {
    const { state: editorState, meta } = useRichTextEditorContext()
    const editor = editorState.editor
    const slash = useEditorState({
        editor,
        selector: ({ editor: currentEditor }) => currentEditor
            ? richTextDateTimeSlashKey.getState(currentEditor.state) ?? inactiveRichTextDateTimeSlashState
            : inactiveRichTextDateTimeSlashState,
    })

    useEffect(() => {
        if (!editor) return
        editor.view.dispatch(editor.state.tr.setMeta(richTextDateTimeSlashKey, { enabled: true }))
        return () => {
            if (!editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta(richTextDateTimeSlashKey, { enabled: false }))
        }
    }, [editor])

    function highlightCommand(event: MouseEvent<HTMLButtonElement>): void {
        const selectedIndex = selectedIndexFromEvent(event)
        if (editor && selectedIndex !== null) {
            editor.view.dispatch(editor.state.tr.setMeta(richTextDateTimeSlashKey, { selectedIndex }))
        }
    }

    function selectCommand(event: MouseEvent<HTMLButtonElement>): void {
        if (!editor || !slash?.active) return
        const kind = kindFromEvent(event)
        if (!kind) return
        editor.chain().focus().deleteRange({ from: slash.from, to: slash.to }).insertContent({
            type: 'dateTime',
            attrs: { kind, value: currentRichTextDateTimeValue(kind, new Date(), meta.dateTimeTimeZone), pickerOpen: true },
        }).run()
    }

    function preserveEditorSelection(event: MouseEvent<HTMLButtonElement>): void {
        event.preventDefault()
    }

    const commands = slash?.active ? filterRichTextDateTimeSlashCommands(slash.query) : []
    return {
        state: { editor, slash, commands },
        actions: { highlightCommand, selectCommand, preserveEditorSelection },
    }
}
