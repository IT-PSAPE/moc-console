import { describe, expect, test } from 'vitest'
import type { PoolClient } from 'pg'
import { operations } from '../../../../../apps/api/server/platform/streams'
import type { PlatformContext } from '../../../../../apps/api/server/platform/context'

function context(query: (text: string, values?: unknown[]) => Promise<unknown>): PlatformContext {
  return {
    db: { query } as unknown as PoolClient,
    userId: 'verified-user',
    workspaceId: 'verified-workspace',
  }
}

describe('streams platform operations', () => {
  test('lists only within the verified workspace and requires read permission', async () => {
    let queryText = ''
    let queryValues: unknown[] = []
    const result = await operations.list.run(context(async (text, values = []) => {
      queryText = text
      queryValues = values
      return { rows: [] }
    }), {})

    expect(operations.list.permission).toBe('can_read')
    expect(queryText).toContain('WHERE workspace_id = $1')
    expect(queryValues).toEqual(['verified-workspace'])
    expect(result).toEqual([])
  })

  test('derives workspace and creator from verified context on stream creation', async () => {
    let queryValues: unknown[] = []
    const result = await operations.insertStream.run(context(async (_text, values = []) => {
      queryValues = values
      return { rows: [] }
    }), {
      record: {
        id: '00000000-0000-4000-8000-000000000001', workspace_id: 'forged-workspace',
        youtube_broadcast_id: 'broadcast-1', youtube_stream_id: 'stream-1', title: 'Title', description: '',
        privacy_status: 'unlisted', is_for_kids: false, stream_status: 'created',
      },
    })

    expect(operations.insertStream.permission).toBe('can_create')
    expect(queryValues[1]).toBe('verified-workspace')
    expect(queryValues.at(-1)).toBe('verified-user')
    expect(result).toBeNull()
  })

  test('rejects a client supplied creator identity', async () => {
    const run = operations.insertStream.run(context(async () => ({ rows: [] })), {
      record: { youtube_broadcast_id: 'broadcast-1', created_by: 'forged-user' },
    })
    await expect(run).rejects.toThrow('Unexpected input field')
  })
})
