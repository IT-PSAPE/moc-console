import { resolve } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { build } from 'vite'

const root = process.cwd()
const dependency = resolve(root, 'test/apps/console/src/features/scheduled-messages/template-management.dependencies.ts')
const aliases: Record<string, string> = {
    '@/': 'apps/console/src/', '@moc/ui/': 'packages/ui/src/',
    '@moc/utils/': 'packages/utils/src/', '@moc/types/': 'packages/types/src/',
}
await build({
    configFile: false,
    resolve: {
        alias: [
            { find: /.*(?:workspace-context|scheduled-message-service)$/, replacement: dependency },
            { find: '@moc/notifications', replacement: resolve(root, 'packages/notifications/src/index.ts') },
            ...Object.entries(aliases).map(([prefix, path]) => ({ find: prefix.slice(0, -1), replacement: resolve(root, path) })),
        ],
        dedupe: ['react', 'react-dom'],
    },
    build: {
        outDir: 'output/playwright/template-management',
        minify: false,
        lib: {
            entry: 'test/apps/console/src/features/scheduled-messages/template-management.fixture.tsx',
            formats: ['es'],
            fileName: 'template-management.fixture',
            cssFileName: 'template-management.fixture',
        },
    },
})
await mkdir('output/playwright/template-management', { recursive: true })
await writeFile('output/playwright/template-management/index.html', '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/template-management.fixture.css"></head><body><div id="root"></div><script type="module" src="/template-management.fixture.js"></script></body></html>')
