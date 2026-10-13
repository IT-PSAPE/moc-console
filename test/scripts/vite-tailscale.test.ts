import { createServer, type Server } from 'node:net'
import { describe, expect, test, vi } from 'vitest'
import { tailscaleDevServer } from '../../scripts/vite-tailscale'

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(() => { throw new Error('Tailscale is not installed in this fixture') }),
}))

async function startListener(): Promise<{ server: Server; port: number }> {
  const server = createServer()
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Expected a TCP listener')
  return { server, port: address.port }
}

async function closeListener(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
}

function configuredServer(): { config: { logger: { info: (message: string) => void } } } {
  return { config: { logger: { info: vi.fn() } } }
}

describe('Tailscale development server startup', () => {
  test('configures a restart while its old listener is still running', async () => {
    const { server, port } = await startListener()
    const plugin = tailscaleDevServer(port)
    try {
      plugin.configureServer(configuredServer())
    } finally {
      await closeListener(server)
    }
    await expect(plugin.buildStart()).resolves.toBeUndefined()
  })

  test('rejects a different listener before starting the new server', async () => {
    const { server, port } = await startListener()
    const plugin = tailscaleDevServer(port)
    try {
      plugin.configureServer(configuredServer())
      await expect(plugin.buildStart()).rejects.toThrow(`Port ${port} is already being served`)
    } finally {
      await closeListener(server)
    }
  })

  test('skips port checks for builds without a development server', async () => {
    const { server, port } = await startListener()
    try {
      await expect(tailscaleDevServer(port).buildStart()).resolves.toBeUndefined()
    } finally {
      await closeListener(server)
    }
  })
})
