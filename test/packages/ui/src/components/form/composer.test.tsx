import { expect, test, vi } from 'vitest'
import type { KeyboardEvent } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Composer } from '../../../../../../packages/ui/src/components/form/composer'
import { useComposer, type UseComposerOptions } from '../../../../../../packages/ui/src/hooks/use-composer'
import { renderQueryHook } from '../../../../../helpers/query-hook'
import { queryClient } from '../../../../../../apps/console/src/lib/query-client'

function keyboard(overrides: Partial<KeyboardEvent<HTMLTextAreaElement>> = {}): KeyboardEvent<HTMLTextAreaElement> {
    return { key: 'Enter', ctrlKey: false, metaKey: false, nativeEvent: { isComposing: false }, preventDefault: vi.fn(), ...overrides } as KeyboardEvent<HTMLTextAreaElement>
}

function composer(options: Partial<UseComposerOptions> = {}): ReturnType<typeof useComposer> {
    return renderQueryHook(() => useComposer({ value: 'A multiline\ncomment', onValueChange: vi.fn(), onSubmit: vi.fn(), ...options }), queryClient)
}

test('plain Enter inserts a newline while Ctrl/Command+Enter submits once during a pending action', async () => {
    let complete: () => void = () => undefined
    const onSubmit = vi.fn(() => new Promise<void>(resolve => { complete = resolve }))
    const control = composer({ onSubmit })
    const plain = keyboard()
    control.actions.keyDown(plain)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(plain.preventDefault).not.toHaveBeenCalled()
    control.actions.keyDown(keyboard({ ctrlKey: true }))
    control.actions.keyDown(keyboard({ metaKey: true }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    complete()
    await Promise.resolve()
    control.actions.keyDown(keyboard({ metaKey: true }))
    expect(onSubmit).toHaveBeenCalledTimes(2)
    complete()
})

test('cannot submit blank, disabled, pending or oversized drafts and respects IME composition', () => {
    for (const options of [{ value: ' \n ' }, { disabled: true }, { pending: true }, { maxLength: 2 }]) {
        const onSubmit = vi.fn()
        composer({ ...options, onSubmit }).actions.keyDown(keyboard({ ctrlKey: true }))
        expect(onSubmit).not.toHaveBeenCalled()
    }
    const onSubmit = vi.fn()
    composer({ onSubmit }).actions.keyDown(keyboard({ ctrlKey: true, nativeEvent: { isComposing: true } as KeyboardEvent<HTMLTextAreaElement>['nativeEvent'] }))
    expect(onSubmit).not.toHaveBeenCalled()
})

test('composes an accessible multiline input with pending submit state', () => {
    const markup = renderToStaticMarkup(<Composer.Root aria-label="Write a reply" value="Draft" onValueChange={vi.fn()} onSubmit={vi.fn()} pending><Composer.Input aria-label="Reply" /><Composer.Footer><Composer.Submit pendingLabel="Sending…">Send</Composer.Submit></Composer.Footer></Composer.Root>)
    expect(markup).toContain('aria-label="Write a reply"')
    expect(markup).toContain('aria-label="Reply"')
    expect(markup).toContain('Sending…')
    expect(markup).toContain('disabled=""')
    expect(markup).toContain('>Draft</textarea>')
})
