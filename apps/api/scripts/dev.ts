import { existsSync, symlinkSync, unlinkSync } from "node:fs"
import { spawn } from "node:child_process"
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

const child = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["--yes", "vercel@58.5.1", "dev", ".", "--listen", "3001", "--local"],
  { cwd: apiDirectory, stdio: "inherit" },
)

function forwardSignal(signal: NodeJS.Signals): void {
  child.kill(signal)
}

process.once("SIGINT", () => forwardSignal("SIGINT"))
process.once("SIGTERM", () => forwardSignal("SIGTERM"))

try {
  process.exitCode = await new Promise<number>((resolve, reject) => {
    child.once("error", reject)
    child.once("exit", (code, signal) => resolve(code ?? (signal === "SIGINT" ? 130 : 143)))
  })
} finally {
  cleanupEnvironmentLink()
}
