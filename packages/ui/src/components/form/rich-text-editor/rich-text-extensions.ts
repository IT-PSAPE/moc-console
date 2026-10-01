import { Plugin, TextSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { Mark, Node } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { TableKit } from '@tiptap/extension-table'
import Highlight from '@tiptap/extension-highlight'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'

const Variable = Node.create({
    name: 'variable', group: 'inline', inline: true, atom: true,
    addAttributes() { return { name: { default: '', parseHTML: element => element.getAttribute('data-variable') } } },
    parseHTML() { return [{ tag: 'span[data-variable]' }] },
    renderHTML({ node }) {
        return ['span', { 'data-variable': node.attrs.name, contenteditable: 'false', class: 'inline-block rounded bg-brand_solid/15 px-1 text-brand font-medium' }, node.attrs.name]
    },
    renderText({ node }) { return `{{${node.attrs.name}}}` },
    addProseMirrorPlugins() {
        return [new Plugin({
            props: {
                handleClickOn(view, _position, node, nodePosition, event, direct) {
                    if (!direct || node.type.name !== 'variable' || event.shiftKey) return false
                    view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, nodePosition, nodePosition + node.nodeSize)))
                    view.focus()
                    return true
                },
                decorations(state) {
                    const { from, to, empty } = state.selection
                    if (empty) return DecorationSet.empty
                    const decorations: Decoration[] = []
                    state.doc.nodesBetween(from, to, (node, position) => {
                        if (node.type.name === 'variable' && position >= from && position + node.nodeSize <= to) {
                            decorations.push(Decoration.node(position, position + node.nodeSize, { 'data-variable-selected': '' }))
                        }
                    })
                    return DecorationSet.create(state.doc, decorations)
                },

            },
        })]
    },
})

const Footer = Node.create({
    name: 'footer', group: 'block', content: 'inline*',
    parseHTML() { return [{ tag: 'footer' }] },
    renderHTML() { return ['footer', { class: 'text-xs text-tertiary' }, 0] },
})

const CodeBlock = Node.create({
    name: 'codeBlock', group: 'block', content: '(text | variable)*', marks: '', code: true, defining: true,
    addAttributes() { return { language: { default: null, parseHTML: element => element.querySelector('code')?.className.replace('language-', '') || null } } },
    parseHTML() { return [{ tag: 'pre', preserveWhitespace: 'full' }] },
    renderHTML({ node }) { return ['pre', {}, ['code', node.attrs.language ? { class: `language-${node.attrs.language}` } : {}, 0]] },
})

const Quote = Node.create({
    name: 'blockquote', group: 'block', content: 'block+', defining: true,
    addAttributes() { return { expandable: { default: false, parseHTML: element => element.hasAttribute('expandable'), renderHTML: attrs => attrs.expandable ? { expandable: '' } : {} } } },
    parseHTML() { return [{ tag: 'blockquote' }] },
    renderHTML({ HTMLAttributes }) { return ['blockquote', HTMLAttributes, 0] },
})

const PullQuote = Node.create({
    name: 'pullQuote', group: 'block', content: 'inline*',
    parseHTML() { return [{ tag: 'aside' }] },
    renderHTML() { return ['aside', { class: 'italic text-secondary' }, 0] },
})

const Summary = Node.create({
    name: 'summary', content: 'inline*', defining: true,
    parseHTML() { return [{ tag: 'summary' }] },
    renderHTML() { return ['summary', {}, 0] },
})

const Details = Node.create({
    name: 'details', group: 'block', content: 'summary block+', defining: true,
    parseHTML() { return [{ tag: 'details' }] },
    renderHTML() { return ['details', { open: '', class: 'rounded border border-secondary p-3' }, 0] },
})

const Spoiler = Mark.create({
    name: 'spoiler',
    parseHTML() { return [{ tag: 'tg-spoiler' }, { tag: 'span[data-spoiler]' }, { tag: 'span.tg-spoiler' }] },
    renderHTML() { return ['span', { 'data-spoiler': '', class: 'rounded bg-tertiary px-0.5' }, 0] },
})

function allowLink(url: string): boolean {
    return /^(https?:|tg:|mailto:|tel:|#)/i.test(url) || /^{{\s*\w+\s*}}$/.test(url)
}

export const richTextExtensions = [
    StarterKit.configure({ trailingNode: false, codeBlock: false, blockquote: false, link: { openOnClick: false, autolink: false, isAllowedUri: allowLink } }),
    TableKit.configure({ table: { resizable: false } }),
    Highlight, Subscript, Superscript, Variable, Footer, CodeBlock, Quote, PullQuote, Summary, Details, Spoiler,
]
