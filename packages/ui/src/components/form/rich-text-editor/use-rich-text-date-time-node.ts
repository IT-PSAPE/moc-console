import { useId, type ChangeEvent, type MouseEvent } from 'react'
import type { NodeViewProps } from '@tiptap/react'
import { Calendar, Clock } from 'iconoir-react'
import {
    currentRichTextDateTimeValue,
    isRichTextDateTimeValue,
    type RichTextDateTimeKind,
} from './rich-text-date-time'

export function useRichTextDateTimeNode({ node, editor, updateAttributes }: NodeViewProps) {
    const kind: RichTextDateTimeKind = node.attrs.kind === 'time' ? 'time' : 'date'
    const value = typeof node.attrs.value === 'string' && isRichTextDateTimeValue(kind, node.attrs.value)
        ? node.attrs.value
        : currentRichTextDateTimeValue(kind)
    const pickerOpen = node.attrs.pickerOpen === true

    function preserveEditorSelection(event: MouseEvent<HTMLButtonElement>): void {
        event.preventDefault()
    }

    function changePickerOpen(open: boolean): void {
        if (editor.isEditable) updateAttributes({ pickerOpen: open })
    }

    function changeValue(event: ChangeEvent<HTMLInputElement>): void {
        const nextValue = event.target.value
        if (editor.isEditable && isRichTextDateTimeValue(kind, nextValue)) updateAttributes({ value: nextValue })
    }

    return {
        state: { kind, value, pickerOpen, inputId: useId(), label: kind === 'date' ? 'Date' : 'Time' },
        actions: { changePickerOpen, changeValue, preserveEditorSelection },
        meta: { Icon: kind === 'date' ? Calendar : Clock, editable: editor.isEditable },
    }
}
