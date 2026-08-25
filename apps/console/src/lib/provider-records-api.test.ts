import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { requestProviderRecords, type ProviderRecordsClientDependencies } from "./provider-records-request"

type CapturedRequest = {
  input: string | URL | Request
  init: RequestInit | undefined
}

function dependencies(captured: CapturedRequest[]): ProviderRecordsClientDependencies {
  return {
    buildSessionHeaders: async () => ({ "X-MOC-Session": "session-token" }),
    getWorkspaceId: async () => "workspace-1",
    request: async (input, init) => {
      captured.push({ input, init })
      return Response.json({ records: [{ id: "record-1" }] })
    },
    resolveApiUrl: (path) => `https://api.example.com${path}`,
  }
}

describe("provider records API client", () => {
  it("requests one Zoom meeting through the API with browser caching disabled", async () => {
    const captured: CapturedRequest[] = []

    const records = await requestProviderRecords<{ id: string }>(
      "zoom-meetings",
      { id: "00000000-0000-4000-8000-000000000001", workspaceId: "workspace-1" },
      dependencies(captured),
    )

    assert.deepEqual(records, [{ id: "record-1" }])
    assert.equal(captured.length, 1)
    assert.equal(captured[0].input, "https://api.example.com/api/provider-records/zoom-meetings?id=00000000-0000-4000-8000-000000000001")
    assert.equal(captured[0].init?.cache, "no-store")
    assert.deepEqual(captured[0].init?.headers, {
      "X-MOC-Session": "session-token",
      "X-MOC-Workspace": "workspace-1",
    })
  })

  it("requests the YouTube stream list for the current workspace", async () => {
    const captured: CapturedRequest[] = []

    await requestProviderRecords("youtube-streams", {}, dependencies(captured))

    assert.equal(captured[0].input, "https://api.example.com/api/provider-records/youtube-streams")
    assert.deepEqual(captured[0].init?.headers, {
      "X-MOC-Session": "session-token",
      "X-MOC-Workspace": "workspace-1",
    })
  })
})
