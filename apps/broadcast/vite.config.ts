import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"
import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import babel from "@rolldown/plugin-babel"
import tailwindcss from "@tailwindcss/vite"

const aliasEntries = [
  {
    find: "@moc/ui/styles.css",
    replacement: fileURLToPath(new URL("../../packages/ui/src/index.css", import.meta.url)),
  },
  {
    find: "@moc/ui",
    replacement: fileURLToPath(new URL("../../packages/ui/src", import.meta.url)),
  },
  {
    find: "@moc/data",
    replacement: fileURLToPath(new URL("../../packages/data/src", import.meta.url)),
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

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  resolve: {
    alias: aliasEntries,
    dedupe: ["react", "react-dom"],
  },
  server: {
    port: 5174,
    strictPort: true,
  },
})
