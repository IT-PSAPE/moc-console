type ApiProxyConfig = Record<string, { target: string; changeOrigin: boolean }>

export function createApiProxy(environment: Record<string, string>): ApiProxyConfig {
  // Match the local API's IPv4 binding instead of resolving localhost to an
  // unrelated process listening on the same port over IPv6.
  const target = environment.MOC_API_PROXY_TARGET?.trim() || 'http://127.0.0.1:3001'
  return { '/api': { target, changeOrigin: true } }
}
