// Bundle this browser-only check with the isolated Messages fixture tooling.
// Inspect its visible result using the supported browser UI tool.
import { Editor } from '@tiptap/core'
import { richTextDateTimeSlashKey } from '../../../../../packages/ui/src/components/form/rich-text-editor/rich-text-date-time-slash'
import { richTextExtensions } from '../../../../../packages/ui/src/components/form/rich-text-editor/rich-text-extensions'
import { editorHtmlToMessageBody, messageBodyToEditorHtml } from '../../../../../apps/console/src/lib/message-editor-html'

let checks = 0
function assert(condition: unknown, message: string): void {
    if (!condition) throw new Error(message)
    checks++
}

const source = '<p><strong>Meeting {{date:2026-10-27}}</strong> at {{time:09:30}}.</p>'
    + '<table><tbody><tr><th>When</th><th>Who</th></tr><tr><td>{{date:2026-10-28}}</td><td><em>Team</em></td></tr></tbody></table>'
const editorHtml = messageBodyToEditorHtml(source)
assert(editorHtml.includes('<strong>Meeting <span data-rich-text-date-time="date" data-value="2026-10-27">'), 'Date token becomes an inline editor chip inside formatting')
assert(editorHtml.includes('<span data-rich-text-date-time="time" data-value="09:30">'), 'Time token becomes an inline editor chip')
assert(editorHtml.includes('<table>') && editorHtml.includes('<td>'), 'Nested table markup survives body import')
assert(!messageBodyToEditorHtml('<p>{{date:2026-02-29}}</p>').includes('data-rich-text-date-time'), 'Invalid values stay literal text')
assert(!messageBodyToEditorHtml('<p><code>{{date:2026-10-27}}</code></p>').includes('data-rich-text-date-time'), 'Date-time syntax inside code remains literal')

const editor = new Editor({
    element: document.createElement('div'),
    extensions: richTextExtensions('Africa/Johannesburg'),
    content: editorHtml,
    parseOptions: { preserveWhitespace: true },
})
const saved = editorHtmlToMessageBody(editor.getHTML())
assert(saved.includes('<strong>Meeting {{date:2026-10-27}}</strong> at {{time:09:30}}.'), 'Chip tokens serialize back to their canonical values in nested formatting')
assert(saved.includes('<table>') && saved.includes('<th>When</th>') && saved.includes('<td>{{date:2026-10-28}}</td>'), 'Table headers, cells, and date chips round-trip')
assert(!saved.includes('data-rich-text-date-time') && !saved.includes('data-value'), 'Editor-only chip attributes never reach the message body')
editor.destroy()

const slashEditor = new Editor({
    element: document.createElement('div'),
    extensions: richTextExtensions('Africa/Johannesburg'),
    content: '',
})
slashEditor.view.dispatch(slashEditor.state.tr.setMeta(richTextDateTimeSlashKey, { enabled: true }))
slashEditor.commands.insertContent('/date')
assert(richTextDateTimeSlashKey.getState(slashEditor.state)?.active, 'Typing slash plus a command opens the filtered menu state')
const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
slashEditor.view.dom.dispatchEvent(enter)
let insertedKind = ''
let insertedValue = ''
slashEditor.state.doc.descendants(node => {
    if (node.type.name === 'dateTime') {
        insertedKind = String(node.attrs.kind)
        insertedValue = String(node.attrs.value)
    }
})
assert(enter.defaultPrevented && insertedKind === 'date', 'Enter replaces the command text with a date chip')
assert(/^\d{4}-\d{2}-\d{2}$/.test(insertedValue), 'Inserted date chip stores a fixed explicit calendar value')
slashEditor.destroy()

const noDateTimeSlotEditor = new Editor({
    element: document.createElement('div'),
    extensions: richTextExtensions(),
    content: '',
})
noDateTimeSlotEditor.commands.insertContent('/date')
assert(!richTextDateTimeSlashKey.getState(noDateTimeSlotEditor.state)?.enabled, 'Slash commands stay disabled unless the DateTime slot is composed')
noDateTimeSlotEditor.destroy()

const afterExistingChipEditor = new Editor({
    element: document.createElement('div'),
    extensions: richTextExtensions('Africa/Johannesburg'),
    content: '<p><span data-rich-text-date-time="date" data-value="2026-10-27">Date · 2026-10-27</span> at /time</p>',
})
afterExistingChipEditor.commands.setTextSelection(afterExistingChipEditor.state.doc.content.size - 1)
assert(afterExistingChipEditor.state.selection.$from.parentOffset === 10, 'Second-chip fixture places the cursor at the end of /time after an inline atom')
afterExistingChipEditor.view.dispatch(afterExistingChipEditor.state.tr.setMeta(richTextDateTimeSlashKey, { enabled: true }))
const secondSlash = richTextDateTimeSlashKey.getState(afterExistingChipEditor.state)
assert(secondSlash?.active && secondSlash.from === 6 && secondSlash.to === 11 && secondSlash.query === 'time', 'Slash range accounts for the preceding inline date atom')
const secondEnter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
afterExistingChipEditor.view.dom.dispatchEvent(secondEnter)
const paragraph = afterExistingChipEditor.state.doc.firstChild
assert(paragraph?.childCount === 3, 'Second insertion preserves the leading date chip, separator text, and new chip')
assert(paragraph?.child(0).type.name === 'dateTime' && paragraph.child(1).text === ' at ' && paragraph.child(2).type.name === 'dateTime', 'Second chip insertion does not remove the space before the command')
assert(secondEnter.defaultPrevented, 'Enter is handled by the slash plugin for the positioned second-chip fixture')
afterExistingChipEditor.destroy()

const output = document.createElement('output')
output.id = 'message-editor-checks'
output.textContent = String(checks)
document.body.append(output)
