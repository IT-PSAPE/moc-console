import { describe, expect, test } from "vitest"
import { createTelegramMiniAppClient } from "../../../packages/sdk/src/telegram-mini-app"
import { createMocTransport } from "../../../packages/sdk/src/transport"

describe("Telegram Mini App SDK", () => {
  test("preserves API error outcomes and messages from non-2xx responses", async () => {
    const client = createTelegramMiniAppClient(createMocTransport("/", {
      fetchImpl: async () => Response.json({ ok: false, error: "unauthorized", message: "Reopen this from Telegram." }, { status: 401 }),
    }))

    await expect(client.send({ op: "view", initData: "signed", target: { kind: "request", id: "00000000-0000-0000-0000-000000000000" } })).resolves.toEqual({
      ok: false,
      error: "unauthorized",
      message: "Reopen this from Telegram.",
    })
  })

  test("maps rate limits and network failures to stable renderable outcomes", async () => {
    const request = { op: "view" as const, initData: "signed", target: { kind: "request" as const, id: "00000000-0000-0000-0000-000000000000" } }
    const rateLimited = createTelegramMiniAppClient(createMocTransport("/", {
      fetchImpl: async () => Response.json({ error: "too_many_requests" }, { status: 429 }),
    }))
    const unreachable = createTelegramMiniAppClient(createMocTransport("/", {
      fetchImpl: async () => { throw new Error("offline") },
    }))

    await expect(rateLimited.send(request)).resolves.toMatchObject({ ok: false, error: "invalid", message: "Too many taps — wait a moment and try again." })
    await expect(unreachable.send(request)).resolves.toMatchObject({ ok: false, error: "invalid", message: "Could not reach the server. Check your connection and try again." })
  })
})
