// Makes a Vite dev server reachable over the machine's Tailscale tailnet, so
// a phone or tablet on the same tailnet can open the app without a tunnel or
// a public URL.
//
// Two things are needed for that, and neither is Vite's default:
//   - bind every interface (`host: true`), not just loopback
//   - allow the MagicDNS Host header. Vite rejects unknown hosts to stop DNS
//     rebinding, and `<machine>.<tailnet>.ts.net` is an unknown host to it.
//
// `.ts.net` covers every MagicDNS name rather than hardcoding one tailnet.
// Those names only resolve for devices already authenticated to the tailnet,
// so this widens the dev server's reach to the tailnet and no further.

import { execFileSync } from "node:child_process"
import { createConnection } from "node:net"

// Deliberately no `vite` import. This file sits at the repo root, above the
// workspaces that depend on Vite, so `import type { Plugin } from "vite"` does
// not resolve from here — and adding Vite to the root manifest just to name a
// type would be the wrong trade. The shapes below describe only what this
// plugin actually touches. Because Vite checks hook parameters
// contravariantly, its real ViteDevServer satisfies DevServerLike, so the
// returned object is still accepted as a plugin at each call site.

type DevServerLike = {
  httpServer?: { once(event: string, listener: () => void): unknown } | null
  config: { logger: { info(message: string): void } }
}

type TailscalePlugin = {
  name: string
  config(): {
    server: { host: boolean; port: number; strictPort: boolean; allowedHosts: string[] }
  }
  configureServer(server: DevServerLike): Promise<void>
}

// The macOS App Store build keeps its CLI inside the bundle and only
// symlinks it to /usr/local/bin when the user runs the "Install CLI" command,
// so look in the bundle too before giving up.
const TAILSCALE_BINARIES = [
  "tailscale",
  "/usr/local/bin/tailscale",
  "/opt/homebrew/bin/tailscale",
  "/Applications/Tailscale.app/Contents/MacOS/Tailscale",
]

type TailscaleStatus = {
  Self?: { DNSName?: string }
}

/**
 * This machine's MagicDNS name without the trailing dot, or null when
 * Tailscale is not installed, not running, or logged out. Never throws: a
 * missing tailnet must not stop a local dev server from starting.
 */
function readTailnetHost(): string | null {
  for (const binary of TAILSCALE_BINARIES) {
    try {
      const output = execFileSync(binary, ["status", "--json"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 3_000,
      })
      const status = JSON.parse(output) as TailscaleStatus
      const dnsName = status.Self?.DNSName?.replace(/\.$/, "")
      if (dnsName) return dnsName
    } catch {
      // Try the next candidate path.
    }
  }
  return null
}

/**
 * True when something is already answering on `port` at `host`.
 *
 * Vite's `strictPort` does not catch every collision. A server bound to
 * loopback only (`[::1]:5175`) and one bound to every interface (`*:5175`)
 * are different addresses, so BOTH binds succeed — and then `localhost`
 * resolves to ::1 and reaches the other process while the tailnet address
 * reaches this one. The dev server looks healthy and serves a different
 * app on localhost, which is a genuinely confusing hour to lose.
 */
function isPortAnswering(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port })
    const settle = (answering: boolean) => {
      socket.destroy()
      resolve(answering)
    }
    socket.setTimeout(500)
    socket.once("connect", () => settle(true))
    socket.once("timeout", () => settle(false))
    socket.once("error", () => settle(false))
  })
}

async function assertPortIsFree(port: number): Promise<void> {
  const [ipv6, ipv4] = await Promise.all([
    isPortAnswering("::1", port),
    isPortAnswering("127.0.0.1", port),
  ])
  if (!ipv6 && !ipv4) return

  const where = ipv6 && ipv4 ? "::1 and 127.0.0.1" : ipv6 ? "::1" : "127.0.0.1"
  throw new Error(
    `Port ${port} is already being served on ${where} by another process.\n` +
      `Binding every interface would still succeed, and http://localhost:${port} ` +
      `would then reach that other server instead of this one.\n` +
      `Stop it (lsof -nP -iTCP:${port} -sTCP:LISTEN) or give this app a different port.`,
  )
}

export function tailscaleDevServer(port: number): TailscalePlugin {
  return {
    name: "moc:tailscale-dev-server",
    config() {
      return {
        server: {
          host: true,
          port,
          strictPort: true,
          allowedHosts: [".ts.net"],
        },
      }
    },
    async configureServer(server: DevServerLike) {
      await assertPortIsFree(port)

      const host = readTailnetHost()
      if (!host) return

      server.httpServer?.once("listening", () => {
        // printUrls is patched by Vite after listening, so appending here
        // keeps the tailnet line inside Vite's own URL block.
        server.config.logger.info(
          `  \x1b[32m➜\x1b[0m  \x1b[1mTailnet\x1b[0m: \x1b[36mhttp://${host}:${port}/\x1b[0m`,
        )
      })
    },
  }
}
