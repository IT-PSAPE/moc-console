import { Bold, Italic, Underline, Strikethrough, Code, Link2, Undo2, Redo2, ChevronDown, Plus, Table2 } from 'lucide-react'
import { Button } from '../../controls/button'
import { Dropdown } from '../../overlays/dropdown'
import { RichTextEditorCommand } from './rich-text-editor-command'
import { RichTextEditorMenuCommand } from './rich-text-editor-menu-command'
import { RichTextEditorLinkDialog } from './rich-text-editor-link-dialog'
import { useRichTextEditorContext } from './rich-text-editor-context'
export function RichTextEditorToolbar() {
    const { state, actions } = useRichTextEditorContext()
    return <>
        <div role="group" aria-label="Text formatting" className="flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-secondary bg-secondary p-1.5">
            <Dropdown><Dropdown.Trigger><Button variant="ghost" icon={<ChevronDown />}>Text style</Button></Dropdown.Trigger><Dropdown.Panel>
                <RichTextEditorMenuCommand command="paragraph">Paragraph</RichTextEditorMenuCommand>
                <RichTextEditorMenuCommand command="h1">Heading 1</RichTextEditorMenuCommand>
                <RichTextEditorMenuCommand command="h2">Heading 2</RichTextEditorMenuCommand>
                <RichTextEditorMenuCommand command="h3">Heading 3</RichTextEditorMenuCommand>
                <RichTextEditorMenuCommand command="h4">Heading 4</RichTextEditorMenuCommand>
                <RichTextEditorMenuCommand command="h5">Heading 5</RichTextEditorMenuCommand>
                <RichTextEditorMenuCommand command="h6">Heading 6</RichTextEditorMenuCommand>
            </Dropdown.Panel></Dropdown>
            <RichTextEditorCommand command="bold" label="Bold" icon={<Bold />} />
            <RichTextEditorCommand command="italic" label="Italic" icon={<Italic />} />
            <RichTextEditorCommand command="underline" label="Underline" icon={<Underline />} />
            <RichTextEditorCommand command="strike" label="Strikethrough" icon={<Strikethrough />} />
            <RichTextEditorCommand command="code" label="Inline code" icon={<Code />} />
            <Button.Icon variant="ghost" icon={<Link2 />} aria-label="Edit link" title="Edit link" onMouseDown={actions.preserveSelection} onClick={actions.openLink} disabled={state.disabled || state.selection?.activeCommands.includes('code')} />
            <Dropdown><Dropdown.Trigger><Button variant="ghost" icon={<Plus />}>Insert</Button></Dropdown.Trigger><Dropdown.Panel>
                <RichTextEditorMenuCommand command="table">Table</RichTextEditorMenuCommand>
                <RichTextEditorMenuCommand command="bulletList">Bullet list</RichTextEditorMenuCommand>
                <RichTextEditorMenuCommand command="orderedList">Numbered list</RichTextEditorMenuCommand>
                <RichTextEditorMenuCommand command="blockquote">Quote</RichTextEditorMenuCommand>
                <RichTextEditorMenuCommand command="codeBlock">Code block</RichTextEditorMenuCommand>
                <RichTextEditorMenuCommand command="divider">Divider</RichTextEditorMenuCommand>
                <Dropdown.Separator />
                <RichTextEditorMenuCommand command="highlight">Highlight</RichTextEditorMenuCommand>
                <RichTextEditorMenuCommand command="subscript">Subscript</RichTextEditorMenuCommand>
                <RichTextEditorMenuCommand command="superscript">Superscript</RichTextEditorMenuCommand>
                <RichTextEditorMenuCommand command="unlink">Remove link</RichTextEditorMenuCommand>
                <RichTextEditorMenuCommand command="clear">Clear formatting</RichTextEditorMenuCommand>
            </Dropdown.Panel></Dropdown>
            {state.selection?.inTable && <Dropdown><Dropdown.Trigger><Button variant="ghost" icon={<Table2 />}>Table</Button></Dropdown.Trigger><Dropdown.Panel>
                <RichTextEditorMenuCommand command="addRow">Add row below</RichTextEditorMenuCommand>
                <RichTextEditorMenuCommand command="addColumn">Add column after</RichTextEditorMenuCommand>
                <RichTextEditorMenuCommand command="deleteRow">Delete row</RichTextEditorMenuCommand>
                <RichTextEditorMenuCommand command="deleteColumn">Delete column</RichTextEditorMenuCommand>
                <RichTextEditorMenuCommand command="deleteTable">Delete table</RichTextEditorMenuCommand>
            </Dropdown.Panel></Dropdown>}
            <RichTextEditorCommand command="undo" label="Undo" icon={<Undo2 />} />
            <RichTextEditorCommand command="redo" label="Redo" icon={<Redo2 />} />
        </div>
        <RichTextEditorLinkDialog />
    </>
}
