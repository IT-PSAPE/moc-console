import type { ReactNode } from 'react'
import { cn } from '@moc/utils/cn'
import { RichTextEditorControls } from './rich-text-editor-controls'

export function RichTextEditorToolbar({ children, className }: { children?: ReactNode; className?: string }) {
    return <div role="group" aria-label="Text formatting" className={cn('flex flex-wrap items-center gap-1 rounded-t-lg border border-b-0 border-secondary bg-secondary p-1.5', className)}>
        {children ?? <RichTextEditorControls />}
    </div>
}
