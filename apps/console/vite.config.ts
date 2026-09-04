import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

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
    find: '@moc/notifications',
    replacement: fileURLToPath(new URL('../../packages/notifications/src', import.meta.url)),
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
    ],
    resolve: {
      alias: aliasEntries,
      // @moc/ui is aliased to source, so its Base UI import resolves React
      // from packages/ui/node_modules while the app resolves it from the
      // root — two module instances, and every Base UI hook throws
      // "Invalid hook call". Dedupe pins both to one copy.
      dedupe: ['react', 'react-dom'],
    },
    server: {
      port: 5173,
      strictPort: true,
    },
  }
})
