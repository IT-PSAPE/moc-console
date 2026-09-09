/**
 * The API's provider proxies are one catch-all function each, but the
 * deployment hands such a function only a single path segment: a request for a
 * nested provider route (`liveBroadcasts/bind`, `meetings/{id}`,
 * `users/me/meetings`) is rejected by the platform before any code runs, and
 * that rejection carries no CORS headers, so a browser reports it as a failed
 * preflight rather than a missing route.
 *
 * `vercel.json` rewrites nested paths onto the single-segment URL below, but
 * building that URL here as well means the call never depends on a rewrite
 * firing. `authorizeProviderRoute` accepts either shape and applies the same
 * method, path and permission rules to both.
 */
const PROXY_SEGMENT = "/_proxy"
const PATH_PARAM = "providerPath"

/**
 * Collapses a nested provider path onto the proxy URL, leaving single-segment
 * paths (the majority) exactly as they are.
 *
 * `/liveBroadcasts/bind?id=x` becomes `/_proxy?id=x&providerPath=liveBroadcasts/bind`.
 */
export function providerProxyPath(path: string): string {
  const queryStart = path.indexOf("?")
  const providerPath = queryStart === -1 ? path : path.slice(0, queryStart)
  const query = queryStart === -1 ? "" : path.slice(queryStart + 1)

  const segments = providerPath.split("/").filter(Boolean)
  if (segments.length <= 1) return path

  const params = new URLSearchParams(query)
  params.set(PATH_PARAM, segments.join("/"))
  return `${PROXY_SEGMENT}?${params.toString()}`
}
