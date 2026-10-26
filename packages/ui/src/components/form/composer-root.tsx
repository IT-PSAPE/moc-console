import type { ReactNode } from 'react'
import { cn } from '@moc/utils/cn'
import { useComposer, type UseComposerOptions } from '../../hooks/use-composer'
import { ComposerContext } from './composer-context'

type ComposerRootProps = UseComposerOptions & {
    children: ReactNode
    className?: string
    'aria-label': string
}

export function ComposerRoot({ children, className, 'aria-label': label, ...options }: ComposerRootProps) {
    const context = useComposer(options)
    return (
        <ComposerContext value={context}>
            <form aria-label={label} aria-busy={context.state.pending || undefined} onSubmit={context.actions.submitForm} className={cn('flex min-w-0 flex-col overflow-hidden rounded-xl border border-primary bg-primary shadow-xs focus-within:border-brand focus-within:ring-3 focus-within:ring-border-brand/15', className)}>
                {children}
            </form>
        </ComposerContext>
    )
}
