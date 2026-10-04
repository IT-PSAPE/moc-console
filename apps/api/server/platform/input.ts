export class PlatformInputError extends Error {
  readonly status = 400
  readonly code = "invalid_input"

  constructor(message: string) {
    super(message)
    this.name = "PlatformInputError"
  }
}

export function objectInput(input: unknown, allowedFields?: readonly string[]): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new PlatformInputError("Expected an input object")
  }
  const record = input as Record<string, unknown>
  if (allowedFields && Object.keys(record).some((field) => !allowedFields.includes(field))) {
    throw new PlatformInputError("Unexpected input field")
  }
  return record
}

export function stringField(input: Record<string, unknown>, name: string): string {
  const value = input[name]
  if (typeof value !== "string") throw new PlatformInputError(`Invalid ${name}`)
  return value
}

export function optionalStringField(input: Record<string, unknown>, name: string): string | undefined {
  if (input[name] === undefined || input[name] === null) return undefined
  return stringField(input, name)
}

export function uuidField(input: Record<string, unknown>, name: string): string {
  const value = stringField(input, name)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new PlatformInputError(`Invalid ${name}`)
  }
  return value
}

export function optionalUuidField(input: Record<string, unknown>, name: string): string | undefined {
  if (input[name] === undefined || input[name] === null) return undefined
  return uuidField(input, name)
}
