import type { ApiRequest, ApiResponse } from "../../server/http.js"
import { handleStorageRequest } from "../../server/storage/handler.js"

export const config = { api: { bodyParser: false } }

export default async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
  await handleStorageRequest(request as ApiRequest & AsyncIterable<Uint8Array | string>, response as ApiResponse & {
    statusCode: number
    write: (chunk: Uint8Array) => boolean
    once: (event: "drain", listener: () => void) => unknown
    end: (body?: unknown) => void
  })
}
