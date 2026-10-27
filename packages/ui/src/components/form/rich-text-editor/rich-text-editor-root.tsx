import type { ReactNode } from 'react'
import { RichTextEditorContext } from './rich-text-editor-context'
import { useRichTextEditor } from './use-rich-text-editor'
export function RichTextEditorRoot({ value, onChange, disabled, dateTimeTimeZone, children }: { value: string; onChange: (html: string) => void; disabled?: boolean; dateTimeTimeZone?: string; children: ReactNode }) {
    const context = useRichTextEditor({ value, onChange, disabled, dateTimeTimeZone })
    return <RichTextEditorContext.Provider value={context}>{children}</RichTextEditorContext.Provider>
}
