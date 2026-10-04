import handler from "../../server/auth-proxy.js"
import type { ApiRequest, ApiResponse } from "../../server/http.js"

type AuthResponse = ApiResponse & { setHeader: (name: string, value: string | string[]) => void }

export default async function authRoute(request: ApiRequest, response: AuthResponse): Promise<void> {
  await handler(request, response)
}
