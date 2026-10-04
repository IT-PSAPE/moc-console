import { describe, expect, test } from 'vitest'
import { objectInput, stringField, uuidField } from '../../../../../apps/api/server/platform/input'

describe('platform operation inputs', () => {
  test('rejects non-object inputs rather than interpreting them as commands', () => {
    expect(() => objectInput(null)).toThrow()
    expect(() => objectInput([])).toThrow()
    expect(() => objectInput('requests')).toThrow()
  })
  test('rejects invalid identity fields before database execution', () => {
    expect(() => uuidField({ id: "' OR true --" }, 'id')).toThrow()
    expect(uuidField({ id: '550e8400-e29b-41d4-a716-446655440000' }, 'id')).toBe('550e8400-e29b-41d4-a716-446655440000')
  })
  test('does not coerce object fields into text', () => {
    expect(() => stringField({ title: {} }, 'title')).toThrow()
    expect(stringField({ title: 'Meeting' }, 'title')).toBe('Meeting')
  })
})
