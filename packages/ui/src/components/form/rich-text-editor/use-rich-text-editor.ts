import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { useEditor, useEditorState, type Editor } from '@tiptap/react'
import { DOMParser as SchemaDOMParser } from '@tiptap/pm/model'
import { richTextExtensions } from './rich-text-extensions'

export type RichTextCommand = 'bold' | 'italic' | 'underline' | 'strike' | 'code' | 'highlight' | 'subscript' | 'superscript' | 'paragraph' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'blockquote' | 'bulletList' | 'orderedList' | 'codeBlock' | 'divider' | 'table' | 'addRow' | 'addColumn' | 'deleteRow' | 'deleteColumn' | 'deleteTable' | 'undo' | 'redo' | 'clear' | 'unlink'

function runCommand(editor: Editor, command: RichTextCommand): void {
    const chain = editor.chain().focus()
    if (/^h[1-6]$/.test(command)) {
        chain.toggleHeading({ level: Number(command[1]) as 1 | 2 | 3 | 4 | 5 | 6 }).run()
        return
    }
    switch (command) {
        case 'bold': chain.toggleBold().run(); break
        case 'italic': chain.toggleItalic().run(); break
        case 'underline': chain.toggleUnderline().run(); break
        case 'strike': chain.toggleStrike().run(); break
        case 'code': chain.toggleCode().run(); break
        case 'highlight': chain.toggleHighlight().run(); break
        case 'subscript': chain.toggleSubscript().run(); break
        case 'superscript': chain.toggleSuperscript().run(); break
        case 'paragraph': chain.setParagraph().run(); break
        case 'blockquote': chain.toggleBlockquote().run(); break
        case 'bulletList': chain.toggleBulletList().run(); break
        case 'orderedList': chain.toggleOrderedList().run(); break
        case 'codeBlock': chain.toggleCodeBlock().run(); break
        case 'divider': chain.setHorizontalRule().run(); break
        case 'table': chain.insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run(); break
        case 'addRow': chain.addRowAfter().run(); break
        case 'addColumn': chain.addColumnAfter().run(); break
        case 'deleteRow': chain.deleteRow().run(); break
        case 'deleteColumn': chain.deleteColumn().run(); break
        case 'deleteTable': chain.deleteTable().run(); break
        case 'undo': chain.undo().run(); break
        case 'redo': chain.redo().run(); break
        case 'clear': chain.unsetAllMarks().clearNodes().run(); break
        case 'unlink': chain.unsetLink().run(); break
    }
}

function readSelectionState({ editor }: { editor: Editor | null }) {
    const commands: RichTextCommand[] = ['bold', 'italic', 'underline', 'strike', 'code', 'highlight', 'subscript', 'superscript']
    return { activeCommands: commands.filter(command => editor?.isActive(command)), inTable: editor?.isActive('table') ?? false }
}

export function useRichTextEditor({ value, onChange, disabled = false }: { value: string; onChange: (html: string) => void; disabled?: boolean }) {
    const lastEmitted = useRef(value)
    const [linkUrl, setLinkUrl] = useState('')
    const [linkOpen, setLinkOpen] = useState(false)
    const editor = useEditor({
        extensions: richTextExtensions,
        content: value,
        editable: !disabled,
        editorProps: { attributes: { role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Rich text editor', class: 'min-h-72 p-4 outline-none' } },
        onUpdate({ editor: current }) {
            lastEmitted.current = current.getHTML()
            onChange(lastEmitted.current)
        },
    })
    const selection = useEditorState({ editor, selector: readSelectionState })

    useEffect(() => {
        if (editor && value !== lastEmitted.current) {
            const document = new DOMParser().parseFromString(value, 'text/html')
            const nextDocument = SchemaDOMParser.fromSchema(editor.schema).parse(document.body)
            if (!editor.state.doc.eq(nextDocument)) editor.commands.setContent(value, { emitUpdate: false })
            lastEmitted.current = value
        }
    }, [editor, value])
    useEffect(() => { editor?.setEditable(!disabled, false) }, [disabled, editor])

    function command(value: RichTextCommand): void { if (editor && !disabled) runCommand(editor, value) }
    function insertVariable(name: string): void {
        if (disabled) return
        const content = editor?.isActive('codeBlock') ? { type: 'text', text: `{{${name}}}` } : { type: 'variable', attrs: { name } }
        editor?.chain().focus().insertContent(content).run()
    }
    function preserveSelection(event: MouseEvent): void { event.preventDefault() }
    function openLink(): void {
        setLinkUrl(String(editor?.getAttributes('link').href ?? ''))
        setLinkOpen(true)
    }
    function closeLink(): void { setLinkOpen(false) }
    function applyLink(): void {
        if (!editor || disabled || !linkUrl.trim()) return
        if (editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl.trim() }).run()) closeLink()
    }
    return {
        state: { editor, selection, disabled, linkOpen, linkUrl, linkValid: Boolean(linkUrl.trim() && editor?.can().setLink({ href: linkUrl.trim() })) },
        actions: { command, insertVariable, preserveSelection, openLink, closeLink, applyLink, setLinkUrl },
        meta: { lastEmitted },
    }
}
