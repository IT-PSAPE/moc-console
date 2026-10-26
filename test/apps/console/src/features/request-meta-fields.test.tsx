import { createElement, type ChangeEvent } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, test, vi } from "vitest"
import type { Request } from "@moc/types/requests"
import { useRequestMetaFields } from "../../../../../apps/console/src/features/requests/use-request-meta-fields"

vi.mock("@moc/ui/components/form/use-date-time-fields", async () => import("../../../../../packages/ui/src/components/form/use-date-time-fields"))
vi.mock("../../../../../apps/console/src/lib/workspace-context", () => ({
  useWorkspace: () => ({ role: null, currentWorkspaceId: "workspace" }),
}))
vi.mock("../../../../../apps/console/src/features/requests/request-provider", () => ({
  useRequests: () => ({ actions: {} }),
}))

const request: Request = {
  id: "request", title: "Rehearsal", status: "not_started", category: "event", requestedBy: "Alex",
  dueDate: "2026-10-26T22:30:00.000Z", createdAt: "2026-10-01T10:00:00.000Z", updatedAt: "2026-10-01T10:00:00.000Z",
  who: "Crew", what: "Rehearsal", when: "Tuesday", where: "Hall", why: "Prepare", how: "Together",
}

function readFields(onFieldChange: <K extends keyof Request>(field: K, value: Request[K]) => void): ReturnType<typeof useRequestMetaFields> {
  let result: ReturnType<typeof useRequestMetaFields> | undefined
  function Probe() {
    result = useRequestMetaFields({ request, categories: [], editable: true, onFieldChange })
    return null
  }
  renderToStaticMarkup(createElement(Probe))
  if (!result) throw new Error("Request field hook did not render")
  return result
}

function inputChange(value: string): ChangeEvent<HTMLInputElement> {
  return { currentTarget: { value } } as ChangeEvent<HTMLInputElement>
}

afterEach(() => vi.restoreAllMocks())

describe("independent request due properties", () => {
  test("editing the date preserves the local time and saves the matching UTC instant", () => {
    const resolvedOptions = new Intl.DateTimeFormat().resolvedOptions()
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({ ...resolvedOptions, timeZone: "Africa/Johannesburg" })
    const changed = vi.fn()
    const fields = readFields(changed)

    expect(fields.state.date).toBe("2026-10-27")
    expect(fields.state.time).toBe("00:30")
    fields.actions.changeDate(inputChange("2026-10-28"))

    expect(changed).toHaveBeenCalledWith("dueDate", "2026-10-27T22:30:00.000Z")
  })

  test("editing the time preserves the local calendar date across a UTC day boundary", () => {
    const resolvedOptions = new Intl.DateTimeFormat().resolvedOptions()
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({ ...resolvedOptions, timeZone: "Africa/Johannesburg" })
    const changed = vi.fn()
    const fields = readFields(changed)

    fields.actions.changeTime(inputChange("14:15"))

    expect(changed).toHaveBeenCalledWith("dueDate", "2026-10-27T12:15:00.000Z")
  })
})
