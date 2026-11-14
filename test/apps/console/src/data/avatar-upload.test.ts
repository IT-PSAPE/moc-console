import { beforeEach, expect, test, vi } from "vitest"

const upload = vi.fn<(input: { purpose: string; file: Blob; signal?: AbortSignal }) => Promise<{ url: string }>>()
const updateProfile = vi.fn()
vi.doMock("../../../../../apps/console/src/lib/moc-client", () => ({ moc: { storage: { upload }, users: { updateProfile } } }))
const { uploadUserAvatar } = await import("../../../../../apps/console/src/data/fetch-users")

beforeEach(() => vi.resetAllMocks())

test("an avatar upload canceled before storage completes cannot update the profile", async () => {
  let resolve: (value: { url: string }) => void = () => undefined
  upload.mockReturnValue(new Promise((next) => { resolve = next }))
  const controller = new AbortController()
  const file = new Blob(["image"])
  const pending = uploadUserAvatar("user", file, controller.signal)
  const rejected = expect(pending).rejects.toMatchObject({ name: "AbortError" })
  expect(upload).toHaveBeenCalledWith({ purpose: "avatar", file, signal: controller.signal })
  controller.abort()
  resolve({ url: "/api/storage/avatars/user/image.png" })
  await rejected
  expect(updateProfile).not.toHaveBeenCalled()
})

test("a completed avatar upload persists its returned API URL", async () => {
  upload.mockResolvedValue({ url: "/api/storage/avatars/user/image.png" })
  await expect(uploadUserAvatar("user", new Blob(["image"]))).resolves.toBe("/api/storage/avatars/user/image.png")
  expect(updateProfile).toHaveBeenCalledWith({ avatarUrl: "/api/storage/avatars/user/image.png" })
})
