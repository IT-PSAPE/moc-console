import { Node, type Editor } from '@tiptap/core'
import type { Node as DocumentNode } from '@tiptap/pm/model'

export function selectedVariable(editor: Editor): { node: DocumentNode; position: number } | null {
    const { from, to, $from, $to } = editor.state.selection
    if ($from.parent.type.name === 'variable' && $from.parent === $to.parent) {
        return { node: $from.parent, position: $from.before() }
    }
    const node = editor.state.doc.nodeAt(from)
    return node?.type.name === 'variable' && to <= from + node.nodeSize ? { node, position: from } : null
}

// Format label selections as one placeholder, and include every variable when
// formatting a larger text selection. Native transactions handle surrounding text.
export function formatSelectedVariable(editor: Editor, command: string): boolean {
    const { from, to } = editor.state.selection
    const variables: { node: DocumentNode; position: number }[] = []
    const content: DocumentNode[] = []
    const current = selectedVariable(editor)
    editor.state.doc.nodesBetween(from, to, (node, position) => {
        if (node.type.name === 'variable') {
            variables.push({ node, position })
            content.push(node)
            return false
        }
        if (node.isText) content.push(node)
    })
    if (current && !variables.some(variable => variable.position === current.position)) {
        variables.push(current)
        content.push(current.node)
    }
    if (!variables.length) return false
    const type = editor.schema.marks[command === 'unlink' ? 'link' : command]
    if (command !== 'clear' && command !== 'unlink' && (!type || !['bold', 'italic', 'underline', 'strike', 'highlight', 'subscript', 'superscript'].includes(command))) return false
    const adding = type && !content.every(node => type.isInSet(node.marks))
    const transaction = editor.state.tr
    if (command === 'clear') transaction.removeMark(from, to)
    else if (command === 'unlink' || !adding) transaction.removeMark(from, to, type)
    else transaction.addMark(from, to, type.create())
    for (const variable of variables) {
        const marks = command === 'clear' ? [] : adding && command !== 'unlink' ? type.create().addToSet(variable.node.marks) : type.removeFromSet(variable.node.marks)
        transaction.setNodeMarkup(variable.position, undefined, variable.node.attrs, marks)
    }
    editor.view.dispatch(transaction)
    return true
}

export const RichTextVariable = Node.create({
    name: 'variable', group: 'inline', inline: true, content: 'text*', marks: '',
    selectable: false, defining: true, priority: 1001,
    parseHTML() { return [{ tag: 'code[data-variable]', priority: 1001 }] },
    renderHTML() { return ['code', { 'data-variable': '' }, 0] },
    renderText({ node }) { return `{{${node.textContent}}}` },
    addKeyboardShortcuts() {
        return {
            'Mod-b': () => formatSelectedVariable(this.editor, 'bold'),
            'Mod-i': () => formatSelectedVariable(this.editor, 'italic'),
            'Mod-u': () => formatSelectedVariable(this.editor, 'underline'),
            'Mod-Shift-s': () => formatSelectedVariable(this.editor, 'strike'),
        }
    },
})
