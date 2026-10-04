import { readFileSync, readdirSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, test } from "bun:test"

const root = resolve(import.meta.dir, "../..")
const applications = ["console", "request", "broadcast"] as const
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx"])
const backendDependency = /^(?:pg|postgres(?:ql)?|mysql2?|better-auth|@neondatabase\/|@aws-sdk\/client-s3)/
const browserCredentialReference = /(?:process|import\.meta)\.env\.[A-Z0-9_]*(?:DATABASE|DB_URL|PASSWORD|SECRET|SERVICE_ROLE|PRIVATE_KEY|ACCESS_KEY)[A-Z0-9_]*/

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>
}

function readJsonc(path: string): Record<string, unknown> {
  const source = readFileSync(path, "utf8")
    .replace(/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*$/gm, "")
    .replace(/^\s*\/\/.*$/gm, "")
  return JSON.parse(source) as Record<string, unknown>
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return sourceExtensions.has(path.slice(path.lastIndexOf("."))) ? [path] : []
  })
}

describe("frontend platform boundary", () => {
  for (const application of applications) {
    test(`${application} uses the SDK through a same-origin API rewrite`, () => {
      const appDirectory = resolve(root, "apps", application)
      const packageJson = readJson(resolve(appDirectory, "package.json"))
      const environmentExample = readFileSync(resolve(appDirectory, ".env.example"), "utf8")
      const dependencies = packageJson.dependencies as Record<string, string>
      const viteConfig = readFileSync(resolve(appDirectory, "vite.config.ts"), "utf8")
      const tsconfig = readJsonc(resolve(appDirectory, "tsconfig.app.json"))
      const compilerOptions = tsconfig.compilerOptions as Record<string, unknown>
      const paths = compilerOptions.paths as Record<string, unknown>
      const vercel = readJson(resolve(appDirectory, "vercel.json"))
      const rewrites = vercel.rewrites as Array<{ source: string; destination: string }>

      expect(dependencies["@moc/sdk"]).toBeDefined()
      expect(Object.keys(dependencies).filter((name) => backendDependency.test(name))).toEqual([])
      expect(environmentExample).not.toMatch(browserCredentialReference)
      expect(viteConfig).toContain("@moc/sdk")
      expect(viteConfig).toContain("MOC_API_PROXY_TARGET")
      expect(viteConfig).toContain("'/api'")
      expect(paths["@moc/sdk/*"]).toBeDefined()
      expect(readFileSync(resolve(appDirectory, "src/lib/moc-client.ts"), "utf8"))
        .toContain('createMocClient("")')
      expect(rewrites[0]).toEqual({
        source: "/api/(.*)",
        destination: "https://api.psape.co.za/api/$1",
      })
      expect(rewrites.findIndex((rewrite) => rewrite.destination.includes("index.html") || rewrite.destination === "/"))
        .toBeGreaterThan(0)
    })

    test(`${application} source uses the SDK for platform network access`, () => {
      const files = sourceFiles(resolve(root, "apps", application, "src"))
      const rawNetwork = /\bfetch\s*\(|\bXMLHttpRequest\b|\bnew\s+(?:EventSource|WebSocket)\s*\(/

      for (const file of files) {
        const source = readFileSync(file, "utf8")
        expect(source).not.toMatch(rawNetwork)
        expect(source).not.toMatch(browserCredentialReference)
      }
    })
  }
})

describe("frontend content security policies", () => {
  for (const application of ["console", "request"] as const) {
    test(`${application} confines browser API connections to the same origin`, () => {
      const vercel = readJson(resolve(root, "apps", application, "vercel.json"))
      const headers = vercel.headers as Array<{ headers: Array<{ key: string; value: string }> }>
      const policies = headers.flatMap((entry) => entry.headers)
        .filter((header) => header.key === "Content-Security-Policy")
        .map((header) => header.value)

      expect(policies.length).toBeGreaterThan(0)
      for (const policy of policies) {
        expect(policy).toContain("connect-src 'self'")
        expect(policy).not.toContain("api.psape.co.za")
      }
    })
  }
})
