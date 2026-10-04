import { describe, expect, test } from "bun:test"
import { MocApiError } from "../../../packages/sdk/src/error"
import { createMocTransport } from "../../../packages/sdk/src/transport"

describe("MoC transport", () => {
  test("joins the API base path, includes credentials, and sends the selected workspace", async () => {
    let requestedUrl = ""
    let requestedInit: RequestInit | undefined
    const transport = createMocTransport("https://api.example.test/", { fetchImpl: async (input, init) => {
      requestedUrl = String(input)
      requestedInit = init
      return Response.json({ ok: true })
    } })

    await expect(transport.request("api/example", { workspaceId: "workspace-1" })).resolves.toEqual({ ok: true })
    expect(requestedUrl).toBe("https://api.example.test/api/example")
    expect(requestedInit?.credentials).toBe("include")
    expect(new Headers(requestedInit?.headers).get("X-MOC-Workspace")).toBe("workspace-1")
  })

  test("sends platform calls as JSON and resolves workspace from the configured resolver", async () => {
    let requestedUrl = ""
    let requestedInit: RequestInit | undefined
    const transport = createMocTransport("/", { getWorkspaceId: async () => "resolved-workspace", fetchImpl: async (input, init) => {
      requestedUrl = String(input)
      requestedInit = init
      return Response.json({ result: 1 })
    } })

    await expect(transport.call("requests", "list", { limit: 5 })).resolves.toEqual({ result: 1 })
    expect(requestedUrl).toBe("/api/platform/requests")
    expect(requestedInit?.method).toBe("POST")
    expect(new Headers(requestedInit?.headers).get("Content-Type")).toBe("application/json")
    expect(new Headers(requestedInit?.headers).get("X-MOC-Workspace")).toBe("resolved-workspace")
    expect(JSON.parse(String(requestedInit?.body))).toEqual({ operation: "list", input: { limit: 5 } })
  })

  test("passes AbortSignal through to fetch", async () => {
    const controller = new AbortController()
    let receivedSignal: AbortSignal | null | undefined
    const transport = createMocTransport("/", { fetchImpl: async (_input, init) => {
      receivedSignal = init?.signal
      return Response.json({ ok: true })
    } })

    await transport.request("/api/example", { signal: controller.signal })
    expect(receivedSignal).toBe(controller.signal)
  })

  test("supports binary bodies and raw response access", async () => {
    let receivedBody: BodyInit | null | undefined
    let receivedMethod: string | undefined
    const transport = createMocTransport("/", { fetchImpl: async (_input, init) => {
      receivedBody = init?.body
      receivedMethod = init?.method
      return new Response(new Uint8Array([1, 2, 3]), { status: 206 })
    } })
    const chunk = new Uint8Array([1, 2, 3])

    const response = await transport.request<Response>("/api/storage/chunk", {
      method: "PUT",
      body: chunk,
      responseType: "response",
    })

    expect(receivedMethod).toBe("PUT")
    expect(receivedBody).toBe(chunk)
    expect(response.status).toBe(206)
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2, 3])
  })

  test("normalizes API error envelopes to MocApiError", async () => {
    const transport = createMocTransport("/", { fetchImpl: async () => Response.json({
      error: { code: "conflict", message: "This item changed" },
      requestId: "req-123",
    }, { status: 409 }) })

    await expect(transport.request("/api/example")).rejects.toMatchObject({
      name: "MocApiError",
      status: 409,
      code: "conflict",
      requestId: "req-123",
      message: "This item changed",
    })
  })

  test("preserves top-level error codes from authentication responses", async () => {
    const transport = createMocTransport("/", { fetchImpl: async () => Response.json({
      code: "EMAIL_NOT_VERIFIED",
      message: "Verify your email before signing in",
    }, { status: 401 }) })

    await expect(transport.request("/api/auth/sign-in")).rejects.toMatchObject({
      status: 401,
      code: "EMAIL_NOT_VERIFIED",
      message: "Verify your email before signing in",
    })
  })

  test("rejects malformed successful responses with a stable API error", async () => {
    const transport = createMocTransport("/", { fetchImpl: async () => new Response("not json", {
      status: 200,
      headers: { "X-Request-Id": "req-bad" },
    }) })

    await expect(transport.request("/api/example")).rejects.toBeInstanceOf(MocApiError)
    await expect(transport.request("/api/example")).rejects.toMatchObject({
      status: 200,
      code: "invalid_response",
      requestId: "req-bad",
    })
  })
})
