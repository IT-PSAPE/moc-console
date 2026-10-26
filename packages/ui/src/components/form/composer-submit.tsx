import type { ComponentProps, ReactNode } from 'react'
import { Button } from '../controls/button'
import { useComposerContext } from './composer-context'

type ComposerSubmitProps = Omit<ComponentProps<typeof Button>, 'type' | 'disabled' | 'onClick'> & { pendingLabel: ReactNode }

export function ComposerSubmit({ children, pendingLabel, size = 'sm', ...props }: ComposerSubmitProps) {
    const { state } = useComposerContext()
    return <Button {...props} type="submit" size={size} disabled={!state.canSubmit}>{state.pending ? pendingLabel : children}</Button>
}
