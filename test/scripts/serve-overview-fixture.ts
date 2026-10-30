import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { namedBreakpointOrder } from '../../scripts/named-breakpoint-order.ts'
import { fixtureApi } from '../apps/console/src/features/overview/fixture-api.ts'

const root = process.cwd()
const fixture = resolve(root, 'test/apps/console/src/features/overview')
const output = resolve(root, 'output/playwright/overview')
await mkdir(output, { recursive: true })
await writeFile(resolve(output, 'index.html'), '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Overview verification fixture</title></head><body><div id="root"></div><script type="module" src="/test/apps/console/src/features/overview/overview.fixture.tsx"></script></body></html>')

async function apiRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of request) {
    const bytes = Buffer.from(chunk as Uint8Array)
    size += bytes.length
    if (size > 65_536) throw Object.assign(new Error('Fixture request too large'), { status: 413 })
    chunks.push(bytes)
  }
  const payload = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { operation?: unknown; input?: unknown }
  const referrer = new URL(request.headers.referer ?? '/', 'http://localhost:5198')
  const capability = new URL(request.url ?? '/', 'http://localhost:5198').pathname.split('/').at(-1) ?? ''
  const viewer = request.headers['x-overview-fixture-role'] === 'viewer' || referrer.searchParams.get('role') === 'viewer'
  const result = fixtureApi(capability, String(payload.operation ?? ''), payload.input, { viewer, empty: referrer.searchParams.get('empty') === '1', fail: referrer.searchParams.get('fail') })
  response.setHeader('Content-Type', 'application/json')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(result))
}
function apiFailure(response: ServerResponse, error: unknown): void {
  response.statusCode = typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number' ? error.status : 500
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Fixture error' }))
}

const server = await createServer({
  configFile: false,
  plugins: [react(), tailwindcss(), {
    name: 'isolated-overview-api',
    configureServer(vite) {
      vite.middlewares.use((request, response, next) => {
        if (request.url?.startsWith('/api/')) { void apiRequest(request, response).catch((error: unknown) => apiFailure(response, error)); return }
        if (request.headers.accept?.includes('text/html')) request.url = '/output/playwright/overview/index.html'
        next()
      })
    },
  }],
  css: { postcss: { plugins: [namedBreakpointOrder()] } },
  resolve: {
    alias: [
      { find: '@/lib/auth-context', replacement: resolve(fixture, 'fixture-auth.ts') },
      { find: '@/lib/workspace-context', replacement: resolve(fixture, 'fixture-workspace.ts') },
      { find: '@/lib/moc-client', replacement: resolve(fixture, 'fixture-moc-client.ts') },
      { find: '@', replacement: resolve(root, 'apps/console/src') },
      { find: '@moc/ui/styles.css', replacement: resolve(root, 'packages/ui/src/index.css') },
      { find: '@moc/ui', replacement: resolve(root, 'packages/ui/src') },
      { find: '@moc/sdk', replacement: resolve(root, 'packages/sdk/src') },
      { find: '@moc/query', replacement: resolve(root, 'packages/query/src') },
      { find: '@moc/notifications', replacement: resolve(root, 'packages/notifications/src') },
      { find: '@moc/utils', replacement: resolve(root, 'packages/utils/src') },
      { find: '@moc/types', replacement: resolve(root, 'packages/types/src') },
    ],
    dedupe: ['react', 'react-dom'],
  },
  server: { host: '127.0.0.1', port: 5198, strictPort: true },
})
await server.listen()
console.log('Isolated Overview fixture: http://localhost:5198/overview')
