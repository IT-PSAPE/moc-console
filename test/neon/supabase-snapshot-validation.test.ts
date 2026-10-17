import { describe, expect, it } from 'vitest'
import { tables } from '../../neon/database/domain-import-tables.mjs'
import { canonicalJson, validateSupabaseSnapshot } from '../../neon/database/supabase-snapshot-validation.mjs'

function snapshot() {
  return {
    version: 1,
    projectId: 'jypshhgfuvwmtbbcxmhs',
    exportedAt: '2026-10-17T09:00:00.000Z',
    tables: tables.map(table => ({
      sourceSchema: table.sourceSchema,
      targetSchema: table.targetSchema,
      name: table.name,
      columns: table.name === 'users' ? ['id', 'email', 'name', 'surname'] : ['id'],
      columnTypes: Object.fromEntries((table.name === 'users' ? ['id', 'email', 'name', 'surname'] : ['id']).map(column => [column, column === 'id' ? 'uuid' : 'text'])),
      rows: table.name === 'users' ? [{ id: '20000000-0000-4000-8000-000000000001', email: 'member@example.test', name: 'Mira', surname: 'Member' }] : [],
      sourceDigest: 'a'.repeat(64),
    })),
    sourceFingerprints: tables.map(table => ({
      name: `${table.sourceSchema}.${table.name}`,
      rows: table.name === 'users' ? 1 : 0,
      digest: 'a'.repeat(64),
    })),
    authUsers: [{
      id: '20000000-0000-4000-8000-000000000001',
      email: 'member@example.test',
      encrypted_password: '$2b$12$' + 'a'.repeat(53),
      email_confirmed_at: '2025-01-01T00:00:00.000Z',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2025-01-01T00:00:00.000Z',
      raw_user_meta_data: { name: 'Mira' },
      banned_until: null,
      deleted_at: null,
    }],
    storageBuckets: [
      { id: 'public-a', public: true },
      { id: 'public-b', public: true },
      { id: 'public-c', public: true },
    ],
    storageObjects: [],
  }
}

describe('Supabase source snapshot validation', () => {
  it('accepts the exact project inventory and verified bcrypt identities', () => {
    const result = validateSupabaseSnapshot(snapshot())
    expect(Object.keys(result.rowCounts)).toHaveLength(49)
    expect(result.rowCounts['public.users']).toBe(1)
  })

  it('rejects project drift and missing or unexpected tables', () => {
    const invalidProject = snapshot()
    invalidProject.projectId = 'another-project'
    expect(() => validateSupabaseSnapshot(invalidProject)).toThrow('project identity')

    const missingTable = snapshot()
    missingTable.tables.pop()
    expect(() => validateSupabaseSnapshot(missingTable)).toThrow('exactly 49')

    const unexpectedTable = snapshot()
    unexpectedTable.tables[0].name = 'unexpected'
    expect(() => validateSupabaseSnapshot(unexpectedTable)).toThrow('missing public.bookings')
  })

  it('rejects source row-count or fingerprint drift', () => {
    const invalid = snapshot()
    invalid.sourceFingerprints[0].rows = 1
    expect(() => validateSupabaseSnapshot(invalid)).toThrow('row count or source fingerprint')
  })

  it('rejects mismatched profiles, non-bcrypt passwords, and unsafe auth states', () => {
    const mismatch = snapshot()
    mismatch.authUsers[0].email = 'different@example.test'
    expect(() => validateSupabaseSnapshot(mismatch)).toThrow('do not match public.users')

    const invalidPassword = snapshot()
    invalidPassword.authUsers[0].encrypted_password = 'not-a-bcrypt-hash'
    expect(() => validateSupabaseSnapshot(invalidPassword)).toThrow('verified bcrypt credential')

    const banned = snapshot()
    banned.authUsers[0].banned_until = '2027-01-01T00:00:00.000Z'
    expect(() => validateSupabaseSnapshot(banned)).toThrow('unverified, banned, or deleted')
  })

  it('rejects target-only columns in the source and private or incomplete storage inventories', () => {
    const extraColumn = snapshot()
    extraColumn.tables.find(table => table.name === 'scheduled_message_occurrences')!.columns.push('attendee_ids')
    expect(() => validateSupabaseSnapshot(extraColumn)).toThrow('target-only columns')

    const privateBucket = snapshot()
    privateBucket.storageBuckets[0].public = false
    expect(() => validateSupabaseSnapshot(privateBucket)).toThrow('must have unique IDs and be public')

    const wrongBucket = snapshot()
    wrongBucket.storageObjects.push({ bucket_id: 'unknown', name: 'image.png' })
    expect(() => validateSupabaseSnapshot(wrongBucket)).toThrow('unknown bucket')

    const duplicateObject = snapshot()
    duplicateObject.storageObjects.push({ bucket_id: 'public-a', name: 'image.png' }, { bucket_id: 'public-a', name: 'image.png' })
    expect(() => validateSupabaseSnapshot(duplicateObject)).toThrow('duplicate paths')
  })

  it('canonicalizes object property order and database dates deterministically', () => {
    expect(canonicalJson({ b: 2, a: new Date('2025-01-01T00:00:00.000Z') }))
      .toBe(canonicalJson({ a: '2025-01-01T00:00:00.000Z', b: 2 }))
  })
})
