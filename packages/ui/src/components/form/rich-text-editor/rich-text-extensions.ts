import { RichTextVariable } from './rich-text-variable'
import StarterKit from '@tiptap/starter-kit'
import { TableKit } from '@tiptap/extension-table'
import Highlight from '@tiptap/extension-highlight'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { RichTextDateTimeNode } from './rich-text-date-time-node'
import { RichTextDateTimeSlash } from './rich-text-date-time-slash'

export function richTextExtensions(dateTimeTimeZone?: string) {
    return [
    StarterKit.configure({ link: { openOnClick: false, protocols: ['tg'] } }),
    TableKit.configure({ table: { resizable: false } }),
    Highlight, Subscript, Superscript, RichTextVariable, RichTextDateTimeNode,
    RichTextDateTimeSlash.configure({ timeZone: dateTimeTimeZone }),
    ]
}
