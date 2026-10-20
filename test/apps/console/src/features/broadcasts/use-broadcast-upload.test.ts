import * as React from "react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { HookRuntime, createMockReactModule } from "../../../../broadcast/src/features/test-hook-runtime"

type Deferred<T> = { promise: Promise<T>; resolve: (value: T) => void }
type UploadHook = typeof import("../../../../../../apps/console/src/features/broadcasts/use-broadcast-upload").useBroadcastUpload

function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => undefined
  const promise = new Promise<T>((nextResolve) => { resolve = nextResolve })
  return { promise, resolve }
}

const toast = vi.fn()
let checkFiles: (files: File[], kind: "audio" | "video") => Promise<{ acceptedFiles: File[]; rejections: [] }>

vi.doMock("react", () => ({ ...React, ...createMockReactModule() }))
vi.doMock("@moc/ui/components/feedback/feedback-provider", () => ({ useFeedback: () => ({ toast }) }))
vi.doMock("../../../../../../apps/console/src/features/broadcasts/broadcast-file-check", () => ({
  checkBroadcastFiles(files: File[], kind: "audio" | "video") { return checkFiles(files, kind) },
}))

const { useBroadcastUpload } = await import("../../../../../../apps/console/src/features/broadcasts/use-broadcast-upload") as { useBroadcastUpload: UploadHook }

const broadcast = { id: "broadcast-id", kind: "audio" } as Parameters<UploadHook>[0]["broadcast"]
const filePartition = (file: File) => ({ acceptedFiles: [file], rejections: [] })

describe("useBroadcastUpload", () => {
  beforeEach(() => {
    checkFiles = async (files) => ({ acceptedFiles: files, rejections: [] })
    toast.mockReset()
  })

  afterEach(() => vi.restoreAllMocks())

  test("canceling a pending check invalidates its result before the dialog is reopened", async () => {
    const pending = deferred<{ acceptedFiles: File[]; rejections: [] }>()
    checkFiles = () => pending.promise
    const onOpenChange = vi.fn()
    const onSubmit = vi.fn(async () => undefined)
    const runtime = new HookRuntime((props: { open: boolean }) => useBroadcastUpload({ broadcast, open: props.open, onOpenChange, onSubmit }))
    let hook = runtime.render({ open: true })
    const file = new File(["audio"], "track.mp3", { type: "audio/mpeg" })
    const adding = hook.actions.addFiles(filePartition(file))
    hook = runtime.rerender()
    expect(hook.state.isChecking).toBe(true)

    hook.actions.cancel()
    runtime.render({ open: false })
    runtime.render({ open: true })
    pending.resolve({ acceptedFiles: [file], rejections: [] })
    await adding
    hook = runtime.rerender()

    expect(hook.state.items).toEqual([])
    expect(hook.state.isChecking).toBe(false)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  test("keeps selected files staged until Save invokes the upload submit callback", async () => {
    const onOpenChange = vi.fn()
    const onSubmit = vi.fn(async () => undefined)
    const runtime = new HookRuntime((props: { open: boolean }) => useBroadcastUpload({ broadcast, open: props.open, onOpenChange, onSubmit }))
    let hook = runtime.render({ open: true })
    const file = new File(["audio"], "track.mp3", { type: "audio/mpeg" })
    await hook.actions.addFiles(filePartition(file))
    hook = runtime.rerender()

    expect(hook.state.items.map((item) => item.file)).toEqual([file])
    expect(onSubmit).not.toHaveBeenCalled()

    await hook.actions.submit()

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ items: [expect.objectContaining({ file, status: "queued" })] }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
