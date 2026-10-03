import { resolve } from 'node:path'

const root = process.cwd()
const dependency = resolve(root, 'test/apps/console/src/features/scheduled-messages/template-management.dependencies.ts')
const aliases: Record<string, string> = {
    '@/': 'apps/console/src/', '@moc/ui/': 'packages/ui/src/',
    '@moc/utils/': 'packages/utils/src/', '@moc/types/': 'packages/types/src/',
}
const result = await Bun.build({
    entrypoints: ['test/apps/console/src/features/scheduled-messages/template-management.fixture.tsx'],
    target: 'browser', outdir: 'output/playwright/template-management',
    plugins: [{ name: 'local-template-fixture', setup(build) {
        build.onResolve({ filter: /workspace-context|scheduled-message-service/ }, () => ({ path: dependency }))
        build.onResolve({ filter: /^(react|react-dom|react-router-dom)(\/.*)?$/ }, args => ({ path: Bun.resolveSync(args.path, resolve(root, 'apps/console')) }))
        build.onResolve({ filter: /^@\// }, args => ({ path: Bun.resolveSync(resolve(root, aliases['@/'], args.path.slice(2)), root) }))
        build.onResolve({ filter: /^@moc\// }, args => {
            if (args.path === '@moc/notifications') return { path: resolve(root, 'packages/notifications/src/index.ts') }
            const prefix = Object.keys(aliases).find(key => args.path.startsWith(key))
            return prefix ? { path: Bun.resolveSync(resolve(root, aliases[prefix], args.path.slice(prefix.length)), root) } : undefined
        })
    } }],
})
if (!result.success) throw new AggregateError(result.logs, 'Fixture build failed')
await Bun.write('output/playwright/template-management/index.html', '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/template-management.fixture.css"></head><body><div id="root"></div><script type="module" src="/template-management.fixture.js"></script></body></html>')
