import { AsyncLocalStorage } from 'node:async_hooks'
import { mock } from 'bun:test'
import type { PoolClient, QueryResultRow } from 'pg'
import * as database from '@moc/backend/database'

type Query = (text: string, values: readonly unknown[]) => Promise<QueryResultRow[]>
type Adapter = { queryRows: Query; queryActor?: Query }
type Scope = { adapter: Adapter | null }
const scopes = new AsyncLocalStorage<Scope>()
const realDatabase = {
  ...database,
  queryRows: database.queryRows,
  withActor: database.withActor,
}

mock.module('@moc/backend/database', () => ({
  ...realDatabase,
  queryRows: async <Row extends QueryResultRow>(text: string, values: readonly unknown[] = []) => {
    const query = scopes.getStore()?.adapter?.queryRows
    return query ? await query(text, values) as Row[] : realDatabase.queryRows<Row>(text, values)
  },
  withActor: async <T>(actor: Parameters<typeof database.withActor>[0], work: (client: PoolClient) => Promise<T>) => {
    const adapter = scopes.getStore()?.adapter
    if (!adapter) return realDatabase.withActor(actor, work)
    const query = adapter.queryActor ?? adapter.queryRows
    const client = { query: async (text: string, values: readonly unknown[] = []) => ({ rows: await query(text, values), rowCount: 1 }) } as unknown as PoolClient
    return work(client)
  },
}))

export function runWithSqlFixture<T>(work: () => Promise<T>): Promise<T> {
  return scopes.run({ adapter: null }, work)
}

export function setSqlFixture(adapter: Adapter): void {
  const scope = scopes.getStore()
  if (!scope) throw new Error('SQL fixture must be set inside runWithSqlFixture')
  scope.adapter = adapter
}
