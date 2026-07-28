import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const aliasEntries = [
  {
    find: '@moc/ui/styles.css',
    replacement: fileURLToPath(new URL('../../packages/ui/src/index.css', import.meta.url)),
  },
  {
    find: '@moc/ui',
    replacement: fileURLToPath(new URL('../../packages/ui/src', import.meta.url)),
  },
  {
    find: '@moc/data',
    replacement: fileURLToPath(new URL('../../packages/data/src', import.meta.url)),
  },
  {
    find: '@moc/types',
    replacement: fileURLToPath(new URL('../../packages/types/src', import.meta.url)),
  },
  {
    find: '@moc/utils',
    replacement: fileURLToPath(new URL('../../packages/utils/src', import.meta.url)),
  },
  {
    find: '@features',
    replacement: fileURLToPath(new URL('./src/features', import.meta.url)),
  },
  {
    find: '@hooks',
    replacement: fileURLToPath(new URL('./src/hooks', import.meta.url)),
  },
  {
    find: '@screens',
    replacement: fileURLToPath(new URL('./src/screens', import.meta.url)),
  },
  {
    find: '@',
    replacement: fileURLToPath(new URL('./src', import.meta.url)),
  },
]

// Server-side code now lives in the MOC API app (apps/api). This config used
// to host a dev-only middleware that proxied /api/zoom/* so Zoom OAuth worked
// under `vite dev`; that duplicated the real handlers. For local Zoom work,
// run the API app (`bun run dev:api`) and point VITE_API_BASE_URL at it.

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
      VitePWA({
        // autoUpdate: the new service worker activates silently in the
        // background (skipWaiting + clientsClaim) and replaces the cache.
        // The active tab keeps running the JS it loaded with — users get
        // the new version on their next manual refresh, no prompt.
        registerType: 'autoUpdate',
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
          description: 'Production operations console — requests, equipment, bookings and streams.',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          // Android Chrome 128+ opts into "draw underneath the system bars"
          // only via display_override. With just `display: standalone` the
          // OS reserves the status bar + gesture-bar regions for itself and
          // shows black behind them. Listing 'edge-to-edge' first asks for
          // true edge-to-edge; 'standalone' is the fallback for older
          // browsers that don't know the term. Note: changing display-mode
          // fields requires users to remove + re-add the PWA for the new
          // manifest to take effect.
          // @ts-expect-error vite-plugin-pwa's manifest types don't include
          // 'edge-to-edge' yet (newer than the bundled type defs); Chrome
          // 128+ recognises the value at runtime.
          display_override: ['edge-to-edge', 'standalone'],
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
      // @moc/ui is aliased to source, so its Base UI import resolves React
      // from packages/ui/node_modules while the app resolves it from the
      // root — two module instances, and every Base UI hook throws
      // "Invalid hook call". Dedupe pins both to one copy.
      dedupe: ['react', 'react-dom'],
    },
  }
})
