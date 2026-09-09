import { describe, expect, test } from "bun:test"
import { queueZoomMeetingOperation } from "./zoom-meeting-operation-queue"

describe("queueZoomMeetingOperation", () => {
  test("waits for a sync before running a later deletion", async () => {
    const events: string[] = []
    let releaseSync: () => void = () => undefined
    const syncCanFinish = new Promise<void>((resolve) => {
      releaseSync = resolve
    })

    const sync = queueZoomMeetingOperation("workspace-sync-delete-race", async () => {
      events.push("sync started")
      await syncCanFinish
      events.push("sync finished")
    })
    const deletion = queueZoomMeetingOperation("workspace-sync-delete-race", async () => {
      events.push("delete")
    })

    await Promise.resolve()
    expect(events).toEqual(["sync started"])

    releaseSync()
    await Promise.all([sync, deletion])
    expect(events).toEqual(["sync started", "sync finished", "delete"])
  })
})
