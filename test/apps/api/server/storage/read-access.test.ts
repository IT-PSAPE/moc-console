import { describe, expect, test } from "bun:test"
import { canReadStorageObject } from "../../../../../apps/api/server/storage/read-access"

const base = {
  ownerUserId: "owner",
  workspaceId: "workspace-a",
  viewerUserId: "viewer",
  sharesProfileWorkspace: false,
  isWorkspaceMember: false,
  linkedToBroadcastItem: false,
}

describe("storage object authorization", () => {
  test("serves broadcast media publicly only while an existing item references it", () => {
    expect(canReadStorageObject({ ...base, bucket: "broadcast-media", viewerUserId: null, linkedToBroadcastItem: true })).toBe(true)
    expect(canReadStorageObject({ ...base, bucket: "broadcast-media", viewerUserId: null })).toBe(false)
  })

  test("limits avatar reads to the owner or an authenticated shared workspace", () => {
    expect(canReadStorageObject({ ...base, bucket: "avatars", ownerUserId: "viewer" })).toBe(true)
    expect(canReadStorageObject({ ...base, bucket: "avatars", viewerUserId: null, sharesProfileWorkspace: true })).toBe(false)
    expect(canReadStorageObject({ ...base, bucket: "avatars", sharesProfileWorkspace: true })).toBe(true)
  })

  test("denies workspace media across workspace boundaries", () => {
    expect(canReadStorageObject({ ...base, bucket: "media", isWorkspaceMember: true })).toBe(true)
    expect(canReadStorageObject({ ...base, bucket: "media", isWorkspaceMember: false })).toBe(false)
    expect(canReadStorageObject({ ...base, bucket: "media", workspaceId: null, isWorkspaceMember: true })).toBe(false)
  })
})
