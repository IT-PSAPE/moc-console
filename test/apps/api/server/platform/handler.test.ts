import { describe, expect, test } from 'vitest'
import type { PoolClient } from 'pg'
import { createPlatformHandler, type PlatformDependencies } from '../../../../../apps/api/server/platform/handler'
import type { PlatformOperation } from '../../../../../apps/api/server/platform/context'

function response() {
  const result = { code: 0, body: null as unknown, headers: {} as Record<string, string | string[]> }
  const sink = {
    status(code: number) { result.code = code; return sink },
    json(body: unknown) { result.body = body },
    setHeader(name: string, value: string | string[]) { result.headers[name] = value },
  }
  return { result, sink }
}

function dependencies(allowed = true): { dependencies: PlatformDependencies; calls: string[] } {
  const calls: string[] = []
  return { calls, dependencies: {
    isAllowedOrigin: (origin) => origin === 'https://console.moc.test',
    authenticate: async () => { calls.push('authenticate'); return { userId: '550e8400-e29b-41d4-a716-446655440000', email: null } },
    authorize: async () => { calls.push('authorize'); if (!allowed) throw Object.assign(new Error('Denied'), {status: 403}) },
    withActor: async (actor, work) => { calls.push(actor.role); return work({} as PoolClient) },
  } }
}
const workspaceId = '550e8400-e29b-41d4-a716-446655440001'
const headers = { origin:'https://console.moc.test', 'x-moc-workspace':workspaceId }

describe('MoC platform boundary', () => {
  test('rejects unknown capabilities and operations without invoking storage', async () => {
    const { dependencies: deps, calls } = dependencies(); const {result,sink}=response()
    await createPlatformHandler({requests:{}},deps)({method:'POST',query:{capability:'requests'},headers,body:{operation:'executeSql',input:{}}},sink)
    expect(result.code).toBe(404); expect(calls).toEqual([])
  })
  test('does not run a mutation when workspace authorization fails', async () => {
    const { dependencies: deps, calls } = dependencies(false); const {result,sink}=response(); let invoked=false
    const operation: PlatformOperation={permission:'can_update',async run(){invoked=true;return null}}
    await createPlatformHandler({requests:{save:operation}},deps)({method:'POST',query:{capability:'requests'},headers,body:{operation:'save',input:{}}},sink)
    expect(result.code).toBe(403); expect(invoked).toBe(false); expect(calls).toEqual(['authenticate','authorize'])
  })
  test('uses a verified actor and workspace in an application transaction', async () => {
    const {dependencies:deps,calls}=dependencies();const {result,sink}=response()
    const operation:PlatformOperation={permission:'can_read',async run(context){return {actor:context.userId,workspace:context.workspaceId}}}
    await createPlatformHandler({requests:{list:operation}},deps)({method:'POST',query:{capability:'requests'},headers,body:{operation:'list',input:{}}},sink)
    expect(result.code).toBe(200); expect(result.body).toEqual({actor:'550e8400-e29b-41d4-a716-446655440000',workspace:workspaceId});expect(calls).toEqual(['authenticate','authorize','moc_app'])
  })
  test('rejects foreign origins before reading sessions or executing an operation', async () => {
    const {dependencies:deps,calls}=dependencies();const {result,sink}=response()
    await createPlatformHandler({},deps)({method:'POST',headers:{origin:'https://attacker.test'},body:{operation:'list',input:{}}},sink)
    expect(result.code).toBe(403);expect(calls).toEqual([])
  })
})
