import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { requestProviderRecords, type ProviderRecordsClientDependencies } from "./provider-records-request"

type CapturedRequest = {
  init: RequestInit | undefined
  path: string
  provider: "youtube" | "zoom"
}

function dependencies(captured: CapturedRequest[]): ProviderRecordsClientDependencies {
  function response(): Response {
    return Response.json({ records: [{ id: "record-1" }] })
  }

  return {
    requestYouTube: async (path, init) => {
      captured.push({ init, path, provider: "youtube" })
      return response()
    },
    requestZoom: async (path, init) => {
      captured.push({ init, path, provider: "zoom" })
      return response()
    },
  }
}

describe("provider records API client", () => {
  it("requests one Zoom meeting through its protected gateway with browser caching disabled", async () => {
    const captured: CapturedRequest[] = []

    const records = await requestProviderRecords<{ id: string }>(
      "zoom-meetings",
      { id: "00000000-0000-4000-8000-000000000001", workspaceId: "workspace-1" },
      dependencies(captured),
    )

    assert.deepEqual(records, [{ id: "record-1" }])
    assert.deepEqual(captured, [{
      init: {
        cache: "no-store",
        headers: { "X-MOC-Workspace": "workspace-1" },
      },
      path: "/moc-records?id=00000000-0000-4000-8000-000000000001",
      provider: "zoom",
    }])
  })

  it("requests the YouTube stream list through its protected gateway", async () => {
    const captured: CapturedRequest[] = []

    await requestProviderRecords("youtube-streams", {}, dependencies(captured))

    assert.deepEqual(captured, [{
      init: { cache: "no-store", headers: undefined },
      path: "/moc-records",
      provider: "youtube",
    }])
  })
})
