import * as React from "react"
import { expect, test, vi } from "vitest"
import { HookRuntime, createMockReactModule } from "../../../broadcast/src/features/test-hook-runtime"

vi.doMock("react", () => ({ ...React, ...createMockReactModule() }))
const { useTaskLifetime } = await import("../../../../../apps/console/src/hooks/use-task-lifetime")

test("scope changes cancel unfinished work and invalidate callbacks retained by the old scope", () => {
  const runtime = new HookRuntime(useTaskLifetime)
  const old = runtime.render("workspace-a")
  const pending = old.start()
  const finished = old.start()
  old.finish(finished)

  const next = runtime.render("workspace-b")
  expect(pending.signal.aborted).toBe(true)
  expect(finished.signal.aborted).toBe(false)
  expect(old.start().signal.aborted).toBe(true)
  const current = next.start()
  expect(current.signal.aborted).toBe(false)
  runtime.unmount()
  expect(current.signal.aborted).toBe(true)
  expect(next.start().signal.aborted).toBe(true)
})

test("an owner's cancellation propagates to child operations and completed work releases its listener", () => {
  const runtime = new HookRuntime(useTaskLifetime)
  const tasks = runtime.render("workspace")
  const parent = new AbortController()
  const child = tasks.start(parent.signal)
  parent.abort(new DOMException("Dismissed", "AbortError"))
  expect(child.signal.reason).toBe(parent.signal.reason)

  const nextParent = new AbortController()
  const completed = tasks.start(nextParent.signal)
  tasks.finish(completed)
  nextParent.abort()
  expect(completed.signal.aborted).toBe(false)
  runtime.unmount()
})
