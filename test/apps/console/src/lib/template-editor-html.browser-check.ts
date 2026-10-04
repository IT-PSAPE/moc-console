// Build with node_modules/.bin/esbuild ./test/apps/console/src/lib/template-editor-html.browser-check.ts
// --target browser --outfile output/playwright/template-editor-html.browser-check.js
// Run test/scripts/template-editor.browser-test.js in an isolated Playwright CLI session.
import { Editor } from '../../../../../packages/ui/node_modules/@tiptap/core'
import { DOMParser as SchemaParser } from '../../../../../packages/ui/node_modules/@tiptap/pm/model'
import { formatSelectedVariable } from '../../../../../packages/ui/src/components/form/rich-text-editor/rich-text-variable'
import { richTextExtensions } from '../../../../../packages/ui/src/components/form/rich-text-editor/rich-text-extensions'
import { templateToEditorHtml, editorHtmlToTemplate, unsupportedTemplateTags, templateHasContent } from '../../../../../apps/console/src/lib/template-editor-html'
import { DEFAULT_TEMPLATES, SAMPLE_TOKENS, renderTemplate, validateTemplate, SCHEDULED_DEFAULT_BODIES, type MessageType } from '@moc/notifications'

let checks = 0
function assert(condition: unknown, message: string): void {
    if (!condition) throw new Error(message)
    checks++
}
function createEditor(source: string): Editor {
    return new Editor({ element: document.createElement('div'), extensions: richTextExtensions, content: templateToEditorHtml(source), parseOptions: { preserveWhitespace: true } })
}
function tokens(source: string): string {
    return [...source.matchAll(/{{\s*(\w+)\s*}}/g)].map(match => match[1]).sort().join(',')
}
function roundTrip(source: string): string {
    const editor = createEditor(source)
    const output = editorHtmlToTemplate(editor.getHTML())
    editor.destroy()
    return output
}
function assertControlledContent(editor: Editor): void {
    const source = editorHtmlToTemplate(editor.getHTML())
    const document = new DOMParser().parseFromString(templateToEditorHtml(source), 'text/html')
    assert(editor.state.doc.eq(SchemaParser.fromSchema(editor.schema).parse(document.body, { preserveWhitespace: true })), 'Controlled content does not replace the native document/selection')
}

for (const [key, source] of Object.entries(DEFAULT_TEMPLATES)) {
    const type = key as MessageType
    const output = roundTrip(source)
    assert(tokens(output) === tokens(source), `${type}: preserves all variables\n${output}`)
    assert(validateTemplate(type, output).length === 0, `${type}: saves valid template`)
    assert(!renderTemplate(output, SAMPLE_TOKENS[type]).includes('{{'), `${type}: delivery interpolates variables`)
    assert(unsupportedTemplateTags(source).length === 0, `${type}: default uses supported markup`)
    const editor = createEditor(source)
    assert(Boolean(editor.schema.nodes.variable), 'Variable identity has its own inline extension')
    assert(Boolean(editor.view.dom.querySelector('code[data-variable]')), 'Custom variables render as code, not spans')
    assertControlledContent(editor)
    editor.destroy()
}
for (const type of ['announcement', 'pre_attendance'] as const) {
    const source = SCHEDULED_DEFAULT_BODIES[type]
    const output = roundTrip(source)
    assert(tokens(output) === tokens(source), `${type}: scheduled variables round-trip`)
}
assert(templateToEditorHtml('{{title}}').includes('<code data-variable="">title</code>'), 'Names-only variable code display')
assert(roundTrip('<code>{{title}}</code>') === '{{title}}', 'Existing code-wrapped placeholder remains a variable')
assert(roundTrip('<code>/ask ai</code>') === '<code>/ask ai</code>', 'Ordinary inline code stays literal')
assert(roundTrip('<code>title</code>') === '<code>title</code>', 'Literal code stays literal even when it matches a variable name')
assert(roundTrip('<code>unknown</code>') === '<code>unknown</code>', 'Unknown code name stays literal')
assert(roundTrip('{{title}}{{instructions}}') === '{{title}}{{instructions}}', 'Adjacent tokens survive native code mark merging')
assert(roundTrip('<code>title_suffix</code>') === '<code>title_suffix</code>', 'Partial name matches stay literal code')
assert(roundTrip('<pre><code class="language-python">print("{{title}}")</code></pre>').includes('{{title}}'), 'Code-block placeholders retain canonical syntax')
assert(roundTrip('<pre><code>title</code></pre>').includes('<code>title</code>'), 'Code-block names are literal')
assert(roundTrip('<a href="{{streamUrl}}">Watch</a>').includes('href="{{streamUrl}}"'), 'URL variables survive')
assert(!roundTrip('<a href="javascript:alert(1)">Unsafe</a>').includes('javascript:'), 'Unsafe URL remains filtered')
assert(roundTrip('<table><tr><td>{{title}}</td></tr></table>').includes('<td>{{title}}</td>'), 'Table cell variable survives')
const wrappedTable = '<div class="tableWrapper"><table><tbody><tr><th>Field</th><th>Value</th></tr><tr><td>Request</td><td>{{title}}</td></tr></tbody></table></div>'
assert(unsupportedTemplateTags(wrappedTable).length === 0, 'Native Tiptap table wrapper must not block the rich editor')
assert(!templateToEditorHtml(wrappedTable).includes('<div'), 'Native table wrapper is removed before parsing editor content')
const tableOutput = roundTrip(wrappedTable)
assert(tableOutput.includes('<td>{{title}}</td>') && tableOutput.includes('<th>Field</th>'), 'Wrapped table preserves header, cell text and variables')
assert(!tableOutput.includes('tableWrapper'), 'Table wrapper is not saved as message content')
assert(tableOutput.startsWith('<table>') && tableOutput.endsWith('</table>'), 'Wrapper normalization does not add empty paragraphs around the table')
assert(unsupportedTemplateTags('<div class="tableWrapper">Keep this text<table><tr><td>Cell</td></tr></table></div>').includes('div'), 'Non-structural wrapper content still requires Source')
assert(unsupportedTemplateTags('<div>Other content</div>').includes('div'), 'Unrelated unsupported markup remains protected')
const tableEditor = createEditor(wrappedTable)
assertControlledContent(tableEditor)
tableEditor.commands.setTextSelection(4)
tableEditor.commands.insertContent('Updated ')
assert(editorHtmlToTemplate(tableEditor.getHTML()).includes('<th>Updated Field</th>'), 'Wrapped table cells remain editable')
assertControlledContent(tableEditor)
tableEditor.destroy()
assert(!templateHasContent('<p><br></p>'), 'Blank template is not saveable')
assert(templateHasContent('{{title}}'), 'Variable-only template is saveable')

const editor = createEditor('Before {{title}} after')
assert(editor.view.dom.querySelector('code')?.textContent === 'title', 'Native DOM contains name without braces')
assert(editor.view.dom.querySelector('code')?.getAttribute('contenteditable') === null, 'Code text is editable')
editor.commands.setTextSelection({ from: 9, to: 11 })
assert(editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to) === 'ti', 'Partial variable selection works')
editor.commands.insertContent('TI')
assert(editor.getHTML().includes('<code data-variable="">TItle</code>'), 'Typing edits part of code normally')
assert(editorHtmlToTemplate(editor.getHTML()).includes('{{TItle}}'), 'Edited variable names remain visible to template validation')
assertControlledContent(editor)
editor.commands.undo()
assert(editor.getHTML().includes('<code data-variable="">title</code>'), 'Undo restores variable')
editor.commands.redo()
assert(editor.getHTML().includes('<code data-variable="">TItle</code>'), 'Redo restores native text edit')
editor.commands.setTextSelection({ from: 9, to: 14 })
editor.commands.insertContent('instructions')
assert(editorHtmlToTemplate(editor.getHTML()).includes('{{instructions}}'), 'Editing to another valid name changes the token')
assertControlledContent(editor)
editor.commands.setTextSelection({ from: 8, to: 22 })
formatSelectedVariable(editor, 'bold')
formatSelectedVariable(editor, 'italic')
formatSelectedVariable(editor, 'underline')
assert(editorHtmlToTemplate(editor.getHTML()).includes('<strong><em><u>{{instructions}}</u></em></strong>'), `Variable inherits bold, italic and underline without losing its identity: ${editor.getHTML()} / ${editorHtmlToTemplate(editor.getHTML())}`)
assertControlledContent(editor)
editor.destroy()

const paragraph = createEditor('Before {{title}} after')
paragraph.commands.selectAll()
formatSelectedVariable(paragraph, 'bold')
assert(editorHtmlToTemplate(paragraph.getHTML()) === '<strong>Before {{title}} after</strong>', 'Formatting a paragraph also formats its variables')
formatSelectedVariable(paragraph, 'bold')
assert(editorHtmlToTemplate(paragraph.getHTML()) === 'Before {{title}} after', 'Toggling paragraph formatting removes it from variables too')
paragraph.destroy()

const quote = createEditor('<blockquote>{{instructions}}</blockquote>')
quote.commands.setTextSelection(quote.state.doc.content.size - 2)
quote.chain().insertContent([
    { type: 'text', text: ' ', marks: [] },
    { type: 'variable', content: [{ type: 'text', text: 'title' }] },
    { type: 'text', text: ' ', marks: [] },
]).unsetCode().run()
assertControlledContent(quote)
quote.commands.insertContent('after')
assert(editorHtmlToTemplate(quote.getHTML()).includes('{{title}} after'), 'Typing after a variable in a quote stays outside code')
quote.destroy()

for (const key of ['Space', 'Enter']) {
    const boundary = createEditor('{{title}}')
    boundary.commands.setTextSelection(7)
    assert(boundary.state.selection.$from.parent.type.name === 'variable', 'Cursor starts inside the variable label')
    boundary.view.dom.dispatchEvent(new KeyboardEvent('keydown', { key: key === 'Space' ? ' ' : 'Enter', bubbles: true, cancelable: true }))
    assert(boundary.state.selection.$from.parent.type.name !== 'variable', `${key} exits the variable label`)
    boundary.commands.insertContent('after')
    const source = editorHtmlToTemplate(boundary.getHTML())
    assert(source === (key === 'Space' ? '{{title}} after' : '{{title}}\n\nafter'), `${key} preserves the token and continues normal text: ${source}`)
    boundary.destroy()
}
const output = document.createElement('output')
output.id = 'editor-checks'
output.textContent = String(checks)
document.body.append(output)
