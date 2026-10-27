import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { RichTextDateTimeView } from './rich-text-date-time-node-view'
import {
    isRichTextDateTimeValue,
    RICH_TEXT_DATE_TIME_KIND_ATTRIBUTE,
    RICH_TEXT_DATE_TIME_VALUE_ATTRIBUTE,
    type RichTextDateTimeKind,
} from './rich-text-date-time'

export const RichTextDateTimeNode = Node.create({
    name: 'dateTime',
    group: 'inline',
    inline: true,
    atom: true,
    selectable: false,
    addAttributes() {
        return {
            kind: {
                default: 'date',
                parseHTML: (element: HTMLElement) => element.getAttribute(RICH_TEXT_DATE_TIME_KIND_ATTRIBUTE) ?? 'date',
                renderHTML: (attributes: Record<string, unknown>) => ({ [RICH_TEXT_DATE_TIME_KIND_ATTRIBUTE]: attributes.kind }),
            },
            value: {
                default: '',
                parseHTML: (element: HTMLElement) => element.getAttribute(RICH_TEXT_DATE_TIME_VALUE_ATTRIBUTE) ?? '',
                renderHTML: (attributes: Record<string, unknown>) => ({ [RICH_TEXT_DATE_TIME_VALUE_ATTRIBUTE]: attributes.value }),
            },
            pickerOpen: { default: false, parseHTML: () => false, renderHTML: () => ({}) },
        }
    },
    parseHTML() {
        return [{
            tag: 'span[data-rich-text-date-time]',
            getAttrs: (element: HTMLElement) => {
                const kind = element.getAttribute(RICH_TEXT_DATE_TIME_KIND_ATTRIBUTE)
                const value = element.getAttribute(RICH_TEXT_DATE_TIME_VALUE_ATTRIBUTE) ?? ''
                if ((kind !== 'date' && kind !== 'time') || !isRichTextDateTimeValue(kind, value)) return false
                return { kind, value, pickerOpen: false }
            },
        }]
    },
    renderHTML({ node, HTMLAttributes }) {
        const kind: RichTextDateTimeKind = node.attrs.kind === 'time' ? 'time' : 'date'
        const value = typeof node.attrs.value === 'string' ? node.attrs.value : ''
        return ['span', mergeAttributes(HTMLAttributes, {
            class: 'rich-text-date-time-token',
            contenteditable: 'false',
        }), (kind === 'date' ? 'Date' : 'Time') + ' · ' + value]
    },
    renderText({ node }) {
        const kind: RichTextDateTimeKind = node.attrs.kind === 'time' ? 'time' : 'date'
        return '{{' + kind + ':' + String(node.attrs.value ?? '') + '}}'
    },
    addNodeView() {
        return ReactNodeViewRenderer(RichTextDateTimeView)
    },
})
