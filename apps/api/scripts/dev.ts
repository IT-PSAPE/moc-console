import { existsSync, symlinkSync, unlinkSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const apiDirectory = join(dirname(fileURLToPath(import.meta.url)), "..")
const vercelEnvironmentPath = join(apiDirectory, ".env")
const localEnvironmentPath = join(apiDirectory, ".env.local")
let createdEnvironmentLink = false

if (!existsSync(vercelEnvironmentPath) && existsSync(localEnvironmentPath)) {
  symlinkSync(".env.local", vercelEnvironmentPath)
  createdEnvironmentLink = true
}

function cleanupEnvironmentLink(): void {
  if (!createdEnvironmentLink) return
  try {
    unlinkSync(vercelEnvironmentPath)
  } catch {
    // The link may already have been removed during process shutdown.
  }
}

const child = Bun.spawn(
  ["bunx", "vercel@58.5.1", "dev", ".", "--listen", "3001", "--local"],
  { cwd: apiDirectory, stdin: "inherit", stdout: "inherit", stderr: "inherit" },
)

function forwardSignal(signal: NodeJS.Signals): void {
  child.kill(signal)
}

process.once("SIGINT", () => forwardSignal("SIGINT"))
process.once("SIGTERM", () => forwardSignal("SIGTERM"))

try {
  process.exitCode = await child.exited
} finally {
  cleanupEnvironmentLink()
}
