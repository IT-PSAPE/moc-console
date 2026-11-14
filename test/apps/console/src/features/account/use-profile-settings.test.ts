import * as React from "react"
import { beforeEach, expect, test, vi } from "vitest"
import { HookRuntime, createMockReactModule } from "../../../../broadcast/src/features/test-hook-runtime"

const uploadUserAvatar = vi.fn<(id: string, blob: Blob, signal?: AbortSignal) => Promise<string>>()
const refreshProfile = vi.fn()
const toast = vi.fn()
const profile = { id: "user", name: "Test", surname: "User", currentDuty: null, statusMessage: null }

vi.doMock("react", () => ({ ...React, ...createMockReactModule() }))
vi.doMock("@moc/ui/components/feedback/feedback-provider", () => ({ useFeedback: () => ({ toast }) }))
vi.doMock("../../../../../../apps/console/src/lib/auth-context", () => ({ useAuth: () => ({ profile, refreshProfile }) }))
vi.doMock("../../../../../../apps/console/src/data/fetch-users", () => ({ uploadUserAvatar, removeUserAvatar: vi.fn(), updateUserProfile: vi.fn() }))
const { useProfileSettings } = await import("../../../../../../apps/console/src/features/account/use-profile-settings")

beforeEach(() => vi.resetAllMocks())

test.each(["close", "unmount"])("%s cancels an avatar upload and ignores its late result", async (action) => {
  let resolve: (value: string) => void = () => undefined
  uploadUserAvatar.mockReturnValue(new Promise((next) => { resolve = next }))
  const runtime = new HookRuntime((open: boolean) => useProfileSettings({ open, onOpenChange: vi.fn() }))
  const hook = runtime.render(true)
  const uploading = hook.actions.uploadAvatar(new Blob(["image"]))
  const signal = uploadUserAvatar.mock.calls[0]?.[2]
  expect(signal?.aborted).toBe(false)
  if (action === "close") runtime.render(false)
  else runtime.unmount()
  expect(signal?.aborted).toBe(true)

  resolve("/api/storage/avatars/user/image.png")
  await uploading

  expect(refreshProfile).not.toHaveBeenCalled()
  expect(toast).not.toHaveBeenCalled()
  if (action === "close") {
    expect(runtime.rerender().state.isUploadingAvatar).toBe(false)
    runtime.unmount()
  }
})

test("a repeated avatar upload cannot start a concurrent request", async () => {
  let resolve: (value: string) => void = () => undefined
  uploadUserAvatar.mockReturnValue(new Promise((next) => { resolve = next }))
  const runtime = new HookRuntime((open: boolean) => useProfileSettings({ open, onOpenChange: vi.fn() }))
  const hook = runtime.render(true)
  const uploading = hook.actions.uploadAvatar(new Blob(["image"]))
  await hook.actions.uploadAvatar(new Blob(["another image"]))
  expect(uploadUserAvatar).toHaveBeenCalledOnce()
  resolve("/api/storage/avatars/user/image.png")
  await uploading
  expect(refreshProfile).toHaveBeenCalledOnce()
  expect(toast).toHaveBeenCalledWith({ title: "Photo updated", variant: "success" })
  expect(runtime.rerender().state.isUploadingAvatar).toBe(false)
  runtime.unmount()
})

test("canceling the crop aborts its upload and a late result cannot affect a replacement upload", async () => {
  let resolveFirst: (value: string) => void = () => undefined
  let resolveSecond: (value: string) => void = () => undefined
  uploadUserAvatar.mockReturnValueOnce(new Promise((next) => { resolveFirst = next }))
  uploadUserAvatar.mockReturnValueOnce(new Promise((next) => { resolveSecond = next }))
  const runtime = new HookRuntime((open: boolean) => useProfileSettings({ open, onOpenChange: vi.fn() }))
  runtime.render(true)
  const first = runtime.rerender().actions.uploadAvatar(new Blob(["first image"]))
  const signal = uploadUserAvatar.mock.calls[0]?.[2]
  expect(runtime.rerender().state.isUploadingAvatar).toBe(true)

  runtime.rerender().actions.cancelAvatarCrop()
  expect(signal?.aborted).toBe(true)
  expect(runtime.rerender().state.isUploadingAvatar).toBe(false)
  const second = runtime.rerender().actions.uploadAvatar(new Blob(["replacement image"]))
  expect(uploadUserAvatar).toHaveBeenCalledTimes(2)

  resolveFirst("/api/storage/avatars/user/first.png")
  await first
  expect(runtime.rerender().state.isUploadingAvatar).toBe(true)
  expect(refreshProfile).not.toHaveBeenCalled()
  expect(toast).not.toHaveBeenCalled()

  resolveSecond("/api/storage/avatars/user/replacement.png")
  await second
  expect(refreshProfile).toHaveBeenCalledOnce()
  expect(toast).toHaveBeenCalledOnce()
  expect(runtime.rerender().state.isUploadingAvatar).toBe(false)
  runtime.unmount()
})
