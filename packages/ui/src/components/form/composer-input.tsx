import type { ComponentProps } from 'react'
import { cn } from '@moc/utils/cn'
import { TextArea } from './text-area'
import { useComposerContext } from './composer-context'

type ComposerInputProps = Omit<ComponentProps<typeof TextArea>, 'value' | 'onChange' | 'onKeyDown' | 'disabled' | 'maxLength' | 'style'>

export function ComposerInput({ className, rows = 2, ...props }: ComposerInputProps) {
    const { state, actions, meta } = useComposerContext()
    return <TextArea {...props} style="ghost" rows={rows} value={state.value} onChange={actions.changeValue} onKeyDown={actions.keyDown} disabled={state.disabled || state.pending} maxLength={meta.maxLength} className={cn('min-h-20 max-h-[min(15rem,35dvh)] overflow-y-auto rounded-none border-0 shadow-none hover:bg-transparent focus-within:bg-transparent focus-within:ring-0', className)} />
}
