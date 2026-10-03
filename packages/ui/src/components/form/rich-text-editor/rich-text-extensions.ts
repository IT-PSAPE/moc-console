import { RichTextVariable } from './rich-text-variable'
import StarterKit from '@tiptap/starter-kit'
import { TableKit } from '@tiptap/extension-table'
import Highlight from '@tiptap/extension-highlight'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'

export const richTextExtensions = [
    StarterKit.configure({ link: { openOnClick: false, protocols: ['tg'] } }),
    TableKit.configure({ table: { resizable: false } }),
    Highlight, Subscript, Superscript, RichTextVariable,
]
