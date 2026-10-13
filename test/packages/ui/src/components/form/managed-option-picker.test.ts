import { describe, expect, test } from 'vitest'
import { isManagedOptionNameAvailable, normalizeManagedOptionLabel, resolveManagedOptionCreateResult } from '../../../../../../packages/ui/src/components/form/use-managed-option-picker'

type Option = { id: string; label: string }

describe('ManagedOptionPicker', () => {
    test('normalizes whitespace around the new label', () => {
        expect(normalizeManagedOptionLabel('  New   option  ')).toBe('New option')
    })

    test('blocks a case-insensitive normalized duplicate but permits the current option during rename', () => {
        const options = [{ id: 'one', label: '  Event   Type ' }]

        expect(isManagedOptionNameAvailable('event type', options, getOptionLabel, getOptionKey)).toBe(false)
        expect(isManagedOptionNameAvailable(' Event  Type ', options, getOptionLabel, getOptionKey, 'one')).toBe(true)
        expect(isManagedOptionNameAvailable('   ', options, getOptionLabel, getOptionKey)).toBe(false)
    })

    test('uses the created option returned by a context that did not change', () => {
        const original = [{ id: 'one', label: 'One' }]
        const created = { id: 'two', label: 'Two' }

        expect(resolveManagedOptionCreateResult(original, original, created, getOptionKey)).toBe(created)
    })

    test('uses the current option instance when the context adds the created ID', () => {
        const original = [{ id: 'one', label: 'One' }]
        const created = { id: 'two', label: 'Two' }
        const current = [...original, { id: 'two', label: 'Two (saved)' }]

        expect(resolveManagedOptionCreateResult(original, current, created, getOptionKey)).toBe(current[1])
    })

    test('ignores a late result after the available options change without its created ID', () => {
        const original = [{ id: 'one', label: 'One' }]
        const created = { id: 'two', label: 'Two' }
        const current = [{ id: 'workspace-two', label: 'Two' }]

        expect(resolveManagedOptionCreateResult(original, current, created, getOptionKey)).toBeNull()
    })
})

function getOptionKey(option: Option) { return option.id }
function getOptionLabel(option: Option) { return option.label }
