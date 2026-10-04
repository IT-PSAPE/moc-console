export type MocApiErrorDetails = {
  status: number
  code: string
  requestId?: string | null
  details?: unknown
}

export class MocApiError extends Error {
  readonly status: number
  readonly code: string
  readonly requestId: string | null
  readonly details: unknown

  constructor(message: string, details: MocApiErrorDetails) {
    super(message)
    this.name = "MocApiError"
    this.status = details.status
    this.code = details.code
    this.requestId = details.requestId ?? null
    this.details = details.details ?? null
  }
}
