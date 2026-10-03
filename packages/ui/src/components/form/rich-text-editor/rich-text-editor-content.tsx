import './rich-text-editor.css'
import { EditorContent } from '@tiptap/react'
import { useRichTextEditorContext } from './rich-text-editor-context'
export function RichTextEditorContent() {
    const { state } = useRichTextEditorContext()
    return <EditorContent editor={state.editor} className="rich-text-editor-content overflow-x-auto rounded-b-lg border border-secondary bg-primary text-primary focus-within:border-brand [&_.ProseMirror]:paragraph-sm [&_.ProseMirror]:caret-brand [&_.ProseMirror_p]:my-2 [&_h1]:text-2xl [&_h2]:text-xl [&_h3]:text-lg [&_h4]:text-base [&_h5]:text-sm [&_h6]:text-xs [&_:is(h1,h2,h3,h4,h5,h6)]:font-semibold [&_:is(h1,h2,h3,h4,h5,h6)]:mt-4 [&_ul]:list-disc [&_ol]:list-decimal [&_:is(ul,ol)]:pl-6 [&_blockquote]:border-l [&_blockquote]:border-secondary [&_blockquote]:pl-3 [&_blockquote]:text-secondary [&_table]:w-full [&_table]:border-collapse [&_:is(td,th)]:border [&_:is(td,th)]:border-secondary [&_:is(td,th)]:p-2 [&_th]:bg-secondary [&_th]:text-left [&_pre]:bg-secondary [&_pre]:p-3 [&_pre]:font-mono [&_hr]:my-4 [&_hr]:border-secondary [&_a]:text-brand [&_a]:underline [&_.selectedCell]:bg-tertiary" />
}
