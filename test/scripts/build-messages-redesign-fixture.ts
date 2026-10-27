import { resolve } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { build } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { namedBreakpointOrder } from '../../scripts/named-breakpoint-order.ts'

const root = process.cwd()
const dependency = resolve(root, 'test/apps/console/src/features/scheduled-messages/messages-redesign.dependencies.ts')
const aliases: Record<string, string> = {
    '@/': 'apps/console/src/', '@moc/ui/': 'packages/ui/src/',
    '@moc/utils/': 'packages/utils/src/', '@moc/types/': 'packages/types/src/',
}
await build({
    configFile: false,
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    plugins: [tailwindcss()],
    css: { postcss: { plugins: [namedBreakpointOrder()] } },
    resolve: {
        alias: [
            { find: /.*(?:workspace-context|scheduled-message-service)$/, replacement: dependency },
            { find: '@moc/ui/styles.css', replacement: resolve(root, 'packages/ui/src/index.css') },
            { find: '@moc/notifications', replacement: resolve(root, 'packages/notifications/src/index.ts') },
            ...Object.entries(aliases).map(([prefix, path]) => ({ find: prefix.slice(0, -1), replacement: resolve(root, path) })),
        ],
        dedupe: ['react', 'react-dom'],
    },
    build: {
        outDir: 'output/message-redesign/site',
        minify: false,
        lib: {
            entry: 'test/apps/console/src/features/scheduled-messages/messages-redesign.fixture.tsx',
            formats: ['es'],
            fileName: 'messages-redesign.fixture',
            cssFileName: 'messages-redesign.fixture',
        },
    },
})
await mkdir('output/message-redesign/site', { recursive: true })
await writeFile('output/message-redesign/site/index.html', '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/messages-redesign.fixture.css"></head><body><div id="root"></div><script type="module" src="/messages-redesign.fixture.js"></script></body></html>')
