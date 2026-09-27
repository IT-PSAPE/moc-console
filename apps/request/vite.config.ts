import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { tailscaleDevServer } from '../../scripts/vite-tailscale'

const aliasEntries = [
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
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
    tailscaleDevServer(5176),
  ],
  resolve: {
    alias: aliasEntries,
  },
})
