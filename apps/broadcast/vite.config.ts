import { fileURLToPath } from "node:url"
import { defineConfig, loadEnv } from "vite"
import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import babel from "@rolldown/plugin-babel"
import tailwindcss from "@tailwindcss/vite"
import { tailscaleDevServer } from "../../scripts/vite-tailscale"

const aliasEntries = [
  {
    find: '@moc/sdk',
    replacement: fileURLToPath(new URL('../../packages/sdk/src', import.meta.url)),
  },
  {
    find: "@moc/ui/styles.css",
    replacement: fileURLToPath(new URL("../../packages/ui/src/index.css", import.meta.url)),
  },
  {
    find: "@moc/ui",
    replacement: fileURLToPath(new URL("../../packages/ui/src", import.meta.url)),
  },
  {
    find: "@moc/types",
    replacement: fileURLToPath(new URL("../../packages/types/src", import.meta.url)),
  },
  {
    find: "@moc/utils",
    replacement: fileURLToPath(new URL("../../packages/utils/src", import.meta.url)),
  },
  {
    find: "@",
    replacement: fileURLToPath(new URL("./src", import.meta.url)),
  },
]

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), '')
  const apiTarget = environment.MOC_API_PROXY_TARGET?.trim() || 'http://localhost:3001'

  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
      tailscaleDevServer(5174),
    ],
    resolve: {
      alias: aliasEntries,
      dedupe: ["react", "react-dom"],
    },
    server: {
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
      },
    },
  }
})
