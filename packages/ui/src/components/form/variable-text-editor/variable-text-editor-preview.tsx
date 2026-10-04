import type { HTMLAttributes } from 'react'
import { cn } from '@moc/utils/cn'
import { useVariableTextEditorContext } from './variable-text-editor-context'

export function VariableTextEditorPreview({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
    const { state } = useVariableTextEditorContext()
    if (state.view !== 'preview') return null
    return <div className={cn('flex flex-col gap-4 rounded-b-lg border border-secondary bg-primary p-4', className)} {...props}>{children}</div>
}
