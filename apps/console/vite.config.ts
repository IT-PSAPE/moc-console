import type { IncomingMessage, ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { proxyZoomApiRequest } from './server/zoom-api'
import { exchangeZoomCode, refreshZoomToken, resolveZoomOAuthConfig, revokeZoomAccessToken } from './server/zoom-oauth'

const aliasEntries = {
  '@': fileURLToPath(new URL('./src', import.meta.url)),
  '@features': fileURLToPath(new URL('./src/features', import.meta.url)),
  '@hooks': fileURLToPath(new URL('./src/hooks', import.meta.url)),
  '@screens': fileURLToPath(new URL('./src/screens', import.meta.url)),
}

type JsonBody = Record<string, unknown>

function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(body))
}

function getStringValue(body: JsonBody, key: string): string | null {
  const value = body[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

async function readRequestBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Uint8Array[] = []

  for await (const chunk of request) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }

  if (chunks.length === 0) {
    return Buffer.alloc(0)
  }

  return Buffer.concat(chunks)
}

function parseJsonBody(buffer: Buffer): JsonBody {
  if (buffer.length === 0) {
    return {}
  }

  return JSON.parse(buffer.toString()) as JsonBody
}

async function sendProxyResponse(response: ServerResponse, proxyResponse: Response) {
  response.statusCode = proxyResponse.status

  const contentType = proxyResponse.headers.get('content-type')
  if (contentType) {
    response.setHeader('Content-Type', contentType)
  }

  response.end(Buffer.from(await proxyResponse.arrayBuffer()))
}

function createZoomDevApiPlugin(env: Record<string, string | undefined>) {
  return {
    name: 'zoom-dev-api',
    configureServer(server: { middlewares: { use: (handler: (request: IncomingMessage, response: ServerResponse, next: () => void) => void | Promise<void>) => void } }) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url ?? '/', 'http://localhost')

        if (!url.pathname.startsWith('/api/zoom/')) {
          next()
          return
        }

        try {
          const bodyBuffer = await readRequestBody(request)

          if (url.pathname.startsWith('/api/zoom/v2')) {
            const suffix = url.pathname.replace('/api/zoom/v2', '')
            const path = `${suffix || '/'}${url.search}`
            const proxyResponse = await proxyZoomApiRequest({
              authorization: request.headers.authorization ?? null,
              body: bodyBuffer,
              contentType: request.headers['content-type'] ?? null,
              method: request.method ?? 'GET',
              path,
            })

            await sendProxyResponse(response, proxyResponse)
            return
          }

          if (request.method !== 'POST') {
            sendJson(response, 405, { error: 'Method not allowed' })
            return
          }

          const config = resolveZoomOAuthConfig(env)
          const body = parseJsonBody(bodyBuffer)

          if (url.pathname === '/api/zoom/oauth/exchange') {
            const code = getStringValue(body, 'code')
            const redirectUri = getStringValue(body, 'redirectUri')

            if (!code || !redirectUri) {
              sendJson(response, 400, { error: 'Missing Zoom OAuth payload' })
              return
            }

            const result = await exchangeZoomCode(config, code, redirectUri)
            sendJson(response, 200, result)
            return
          }

          if (url.pathname === '/api/zoom/oauth/refresh') {
            const refreshTokenValue = getStringValue(body, 'refreshToken')

            if (!refreshTokenValue) {
              sendJson(response, 400, { error: 'Missing refresh token' })
              return
            }

            const result = await refreshZoomToken(config, refreshTokenValue)
            sendJson(response, 200, result)
            return
          }

          if (url.pathname === '/api/zoom/oauth/revoke') {
            const token = getStringValue(body, 'token')

            if (!token) {
              sendJson(response, 400, { error: 'Missing access token' })
              return
            }

            await revokeZoomAccessToken(config, token)
            sendJson(response, 200, { ok: true })
            return
          }

          next()
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Zoom request failed'
          sendJson(response, 500, { error: message })
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      createZoomDevApiPlugin(env),
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: [
          'favicon.svg',
          'logo.svg',
          'icons/apple-touch-icon.png',
          'icons/icon-192.png',
          'icons/icon-512.png',
          'icons/icon-maskable-192.png',
          'icons/icon-maskable-512.png',
          'icons/splash/*.png',
        ],
        manifest: {
          name: 'MOC Console',
          short_name: 'MOC Console',
          description: 'Production operations console for broadcast teams — streams, meetings, cues, requests.',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
            { src: '/logo.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff,woff2}'],
          // Don't precache source maps or dev artifacts; skip large preload chunks.
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          // Exclude API calls + Supabase + Zoom/YouTube endpoints from the SPA
          // navigation fallback; they must always hit the network.
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/auth\//],
          cleanupOutdatedCaches: true,
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: aliasEntries,
    },
  }
})
