import { describe, expect, test } from 'vitest'
import { createApiProxy } from '../../scripts/vite-api-proxy'

describe('development API proxy', () => {
  test('targets the local API IPv4 listener instead of a localhost IPv6 server', () => {
    expect(createApiProxy({})).toEqual({
      '/api': { target: 'http://127.0.0.1:3001', changeOrigin: true },
    })
    expect(createApiProxy({ MOC_API_PROXY_TARGET: '  ' })).toEqual(createApiProxy({}))
  })

  test('honors an explicit custom backend target', () => {
    expect(createApiProxy({ MOC_API_PROXY_TARGET: ' http://127.0.0.1:4001 ' })).toEqual({
      '/api': { target: 'http://127.0.0.1:4001', changeOrigin: true },
    })
  })
})
