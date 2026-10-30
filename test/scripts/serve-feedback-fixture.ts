import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createServer } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { namedBreakpointOrder } from '../../scripts/named-breakpoint-order.ts'

const root = process.cwd()
const output = resolve(root, 'output/playwright/notifications')
await mkdir(output, { recursive: true })
await writeFile(resolve(output, 'index.html'), '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="/test/packages/ui/src/components/feedback/feedback.fixture.tsx"></script></body></html>')

const server = await createServer({
    configFile: false,
    plugins: [tailwindcss()],
    css: { postcss: { plugins: [namedBreakpointOrder()] } },
    resolve: {
        alias: [
            { find: '@moc/ui/styles.css', replacement: resolve(root, 'packages/ui/src/index.css') },
            { find: '@moc/ui', replacement: resolve(root, 'packages/ui/src') },
            { find: '@moc/utils', replacement: resolve(root, 'packages/utils/src') },
            { find: '@moc/types', replacement: resolve(root, 'packages/types/src') },
        ],
        dedupe: ['react', 'react-dom'],
    },
    server: { host: '127.0.0.1', port: 5199, strictPort: true },
})
await server.listen()
console.log('Notification fixture: http://127.0.0.1:5199/output/playwright/notifications/')
