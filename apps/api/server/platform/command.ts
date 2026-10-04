import { headerValue, type ApiRequest } from "../http.js"
import { objectInput, PlatformInputError, stringField, uuidField } from "./input.js"

export type PlatformCommand = {
  capability: string
  operation: string
  input: unknown
  workspaceId: string
}

export function parseCommand(request: ApiRequest): PlatformCommand {
  let body = request.body
  if (typeof body === "string") {
    try { body = JSON.parse(body) as unknown } catch { throw new PlatformInputError("Invalid JSON") }
  }
  if (Buffer.byteLength(JSON.stringify(body) ?? "", "utf8") > 64 * 1024) {
    throw Object.assign(new PlatformInputError("Request body too large"), { status: 413 })
  }
  const command = objectInput(body, ["operation", "input"])
  const capability = request.query?.capability
  if (typeof capability !== "string" || !/^[a-zA-Z][a-zA-Z-]{0,63}$/.test(capability)) {
    throw new PlatformInputError("Invalid capability")
  }
  const operation = stringField(command, "operation")
  if (!/^[a-zA-Z][a-zA-Z.]{0,63}$/.test(operation)) throw new PlatformInputError("Invalid operation")
  const input = command.input ?? null
  const headerWorkspace = headerValue(request.headers, "x-moc-workspace")
  const inputWorkspace = input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>).workspaceId : undefined
  if (inputWorkspace !== undefined && typeof inputWorkspace !== "string") {
    throw new PlatformInputError("Invalid workspaceId")
  }
  if (headerWorkspace && inputWorkspace && headerWorkspace !== inputWorkspace) {
    throw new PlatformInputError("Workspace context does not match input")
  }
  const workspace = headerWorkspace ?? inputWorkspace
  return { capability, operation, input, workspaceId: workspace ? uuidField({ workspace }, "workspace") : "" }
}
