import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { tailscaleDevServer } from '../../scripts/vite-tailscale'

const aliasEntries = [
  {
    find: '@moc/sdk',
    replacement: fileURLToPath(new URL('../../packages/sdk/src', import.meta.url)),
  },
  {
    find: '@moc/notifications',
    replacement: fileURLToPath(new URL('../../packages/notifications/src', import.meta.url)),
  },
  {
    find: '@',
    replacement: fileURLToPath(new URL('./src', import.meta.url)),
  },
]

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '')
  const apiTarget = environment.MOC_API_PROXY_TARGET?.trim() || 'http://localhost:3001'

  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
      tailscaleDevServer(5176),
    ],
    resolve: {
      alias: aliasEntries,
    },
    server: {
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
      },
    },
  }
})
