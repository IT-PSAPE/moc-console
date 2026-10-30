import { spawn, type ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import { copyFile, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

const repository = fileURLToPath(new URL('../..', import.meta.url))

async function availablePort(): Promise<number> {
  const listener = createServer()
  await new Promise<void>((resolve) => listener.listen(0, '127.0.0.1', resolve))
  const address = listener.address()
  if (!address || typeof address === 'string') throw new Error('Expected TCP address')
  await new Promise<void>((resolve, reject) => listener.close((error) => error ? reject(error) : resolve()))
  return address.port
}

async function stop(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return
  const exited = once(child, 'exit')
  child.kill('SIGTERM')
  await exited
}

test('local API serves changed dependencies and recovers from a broken handler without restarting', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'moc-local-api-'))
  const api = join(directory, 'apps/api')
  await Promise.all(['api', 'server', 'scripts'].map((folder) => mkdir(join(api, folder), { recursive: true })))
  await symlink(join(repository, 'node_modules'), join(directory, 'node_modules'), 'dir')
  const script = join(api, 'scripts/dev-local.ts')
  const dependency = join(api, 'server/registry.ts')
  await copyFile(join(repository, 'apps/api/scripts/dev-local.ts'), script)
  await writeFile(dependency, 'export const operation = "old operation"\n')
  await writeFile(join(api, 'api/probe.ts'), 'import { operation } from "../server/registry.ts"\nexport default function handler(_request, response) { response.json({ operation }) }\n')
  const port = await availablePort()
  const child = spawn(process.execPath, [script], { cwd: directory, env: { ...process.env, MOC_API_PORT: String(port), MOC_API_HOST: '127.0.0.1' }, stdio: ['ignore', 'pipe', 'pipe'] })
  let output = ''
  child.stdout?.on('data', (chunk: Buffer) => { output += chunk.toString() })
  child.stderr?.on('data', (chunk: Buffer) => { output += chunk.toString() })
  const url = `http://127.0.0.1:${port}/api/probe`

  async function responseOperation(): Promise<string | undefined> {
    const response = await fetch(url, { signal: AbortSignal.timeout(2_000) })
    if (!response.ok) return undefined
    const body = await response.json() as { operation?: string }
    return body.operation
  }

  try {
    await expect.poll(() => output, { timeout: 8_000 }).toContain('[local-api] listening')
    expect(await responseOperation()).toBe('old operation')
    await writeFile(dependency, 'export const operation = "new quote operation"\n')
    await expect.poll(responseOperation, { timeout: 3_000 }).toBe('new quote operation')
    await writeFile(dependency, 'throw new Error("temporary fixture failure")\nexport const operation = "broken"\n')
    await expect.poll(responseOperation, { timeout: 3_000 }).toBeUndefined()
    await writeFile(dependency, 'export const operation = "recovered quote operation"\n')
    await expect.poll(responseOperation, { timeout: 3_000 }).toBe('recovered quote operation')
    expect(child.exitCode).toBeNull()
  } finally {
    await stop(child)
    await rm(directory, { recursive: true, force: true })
  }
}, 20_000)
