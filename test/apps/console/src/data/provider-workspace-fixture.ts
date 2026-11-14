import { createMocClient } from '@moc/sdk'

export const WORKSPACE_A = '11111111-1111-4111-8111-111111111111'
export const WORKSPACE_B = '22222222-2222-4222-8222-222222222222'
type Call = { path: string; method: string; workspaceId: string | null; body: Record<string, unknown> | null }
export const fixture = {
  selectedWorkspace: WORKSPACE_A,
  calls: [] as Call[],
  providerGate: null as Promise<void> | null,
  failInsert: false,
  confirmedInsert: false,
  failNextStreamUpdate: false,
  insertedId: '',
}

function providerPath(url: URL): string {
  const collapsed = url.searchParams.get('providerPath')
  return collapsed ? `/${collapsed}` : url.pathname.replace(/^\/api\/(youtube\/v3|zoom\/v2)/, '')
}

const fetchImpl: typeof fetch = async (input, options) => {
  const url = new URL(String(input), 'https://console.example.test')
  const body = typeof options?.body === 'string' ? JSON.parse(options.body) as Record<string, unknown> : null
  const call: Call = { path: url.pathname + url.search, method: options?.method ?? 'GET', workspaceId: new Headers(options?.headers).get('X-MOC-Workspace'), body }
  fixture.calls.push(call)
  if (url.pathname === '/api/auth/get-session') {
    return Response.json({ session: { id: 'session', userId: 'member', expiresAt: '2099-01-01' }, user: { id: 'member', email: 'member@example.test' } })
  }
  if (/\/api\/(youtube|zoom)\//.test(url.pathname)) {
    const gate = fixture.providerGate
    fixture.providerGate = null
    if (gate) await gate
    if (!call.workspaceId) return Response.json({ error: 'Missing workspace context' }, { status: 400 })
    const path = providerPath(url)
    if (path === '/videoCategories') return Response.json({ items: [{ id: '22', snippet: { title: 'People', assignable: true } }] })
    if (path === '/playlists') return Response.json({ items: [{ id: 'playlist-a', snippet: { title: 'Workspace A' }, contentDetails: { itemCount: 2 } }] })
    if (path === '/liveBroadcasts' && call.method === 'POST') return Response.json({ id: 'broadcast-a', snippet: {} })
    if (path === '/liveStreams' && call.method === 'POST') return Response.json({ id: 'ingestion-a', cdn: { ingestionInfo: {} } })
    if (path === '/liveBroadcasts' && url.searchParams.has('broadcastStatus')) return Response.json({ items: [] })
    if (path === '/liveBroadcasts' && call.method === 'GET') return Response.json({ items: [{ contentDetails: { boundStreamId: 'ingestion-a' }, snippet: { thumbnails: {} } }] })
    if (path === '/videos' && call.method === 'GET') return Response.json({ items: [{ snippet: { title: 'Workspace A' } }] })
    if (path === '/users/me/meetings' && call.method === 'POST') return Response.json({ id: 101, join_url: 'https://zoom.example.test/101' })
    if (path === '/users/me/meetings') return Response.json({ meetings: [] })
    return Response.json({})
  }
  if (url.pathname === '/api/platform/streams') {
    if (!call.workspaceId) return Response.json({ error: { message: 'Select a workspace' } }, { status: 400 })
    const operation = body?.operation
    const command = body?.input as Record<string, unknown>
    if (operation === 'insertStream' || operation === 'insertZoomMeeting') {
      fixture.insertedId = (command.record as { id: string }).id
      if (fixture.failInsert) return Response.json({ error: { message: 'Connection lost' } }, { status: 500 })
    }
    if (operation === 'updateStream' && fixture.failNextStreamUpdate) {
      fixture.failNextStreamUpdate = false
      return Response.json({ error: { message: 'Connection lost' } }, { status: 500 })
    }
    if ((operation === 'get' || operation === 'getZoomMeeting') && fixture.confirmedInsert) {
      return Response.json({ id: fixture.insertedId, workspaceId: WORKSPACE_A })
    }
    if (operation === 'list' || operation === 'listZoomMeetings') return Response.json([])
    return Response.json(null)
  }
  if (url.pathname.startsWith('/api/notifications/')) return Response.json({ ok: true, attempted: 1, dispatched: 1, failed: 0, pendingRetry: 0 })
  throw new Error(`Unexpected test API call ${url.pathname}`)
}

export const fixtureMoc = createMocClient('', { fetchImpl })

export function resetProviderFixture(): void {
  fixture.selectedWorkspace = WORKSPACE_A
  fixture.calls = []
  fixture.providerGate = null
  fixture.failInsert = false
  fixture.confirmedInsert = false
  fixture.failNextStreamUpdate = false
  fixture.insertedId = ''
}

export function holdNextProviderRequest(): () => void {
  let release: () => void = () => undefined
  fixture.providerGate = new Promise<void>((resolve) => { release = resolve })
  return release
}

export function scopedCalls(): Call[] {
  return fixture.calls.filter(call => /\/api\/(youtube|zoom)\//.test(call.path) || call.path.startsWith('/api/platform/streams'))
}
