import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [{
    name: 'moc-app-aliases',
    async resolveId(source, importer) {
      const prefix = ['@/', '@features/', '@hooks/', '@screens/'].find((value) => source.startsWith(value))
      if (!prefix || !importer) return
      const app = importer.match(/(?:^|\/)apps\/(console|request|broadcast)\//)?.[1]
      if (!app) return
      const directory = prefix === '@/' ? '' : `${prefix.slice(1, -1)}/`
      return this.resolve(`${root}apps/${app}/src/${directory}${source.slice(prefix.length)}`, importer, { skipSelf: true })
    },
  }],
  resolve: {
    alias: [
      { find: /^@moc\/backend\/(.*)$/, replacement: `${root}packages/backend/src/$1.ts` },
      { find: '@moc/backend', replacement: `${root}packages/backend/src/index.ts` },
      { find: /^@moc\/notifications\/(.*)$/, replacement: `${root}packages/notifications/src/$1.ts` },
      { find: '@moc/notifications', replacement: `${root}packages/notifications/src/index.ts` },
    ],
    dedupe: ['react', 'react-dom'],
  },
  test: {
    include: ['test/**/*.test.{ts,tsx}'],
    environment: 'node',
    env: { TZ: 'UTC' },
    isolate: true,
    maxWorkers: 2,
  },
})
