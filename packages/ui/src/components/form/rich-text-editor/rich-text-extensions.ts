import { Node } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { TableKit } from '@tiptap/extension-table'
import Highlight from '@tiptap/extension-highlight'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'

// A variable keeps its template identity while displaying only its name.
// Selection and deletion use Tiptap's normal inline-node behavior.
const Variable = Node.create({
    name: 'variable', group: 'inline', inline: true, atom: true,
    addAttributes() { return { name: { default: '', parseHTML: element => element.getAttribute('data-variable') } } },
    parseHTML() { return [{ tag: 'span[data-variable]' }] },
    renderHTML({ node }) { return ['span', { 'data-variable': node.attrs.name }, node.attrs.name] },
    renderText({ node }) { return `{{${node.attrs.name}}}` },
})

export const richTextExtensions = [
    StarterKit.configure({ link: { openOnClick: false, protocols: ['tg'] } }),
    TableKit.configure({ table: { resizable: false } }),
    Highlight, Subscript, Superscript, Variable,
]
