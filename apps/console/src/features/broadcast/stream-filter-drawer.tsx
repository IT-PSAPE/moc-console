import { Button } from "@/components/controls/button"
import { Divider } from "@/components/display/divider"
import { Label, Paragraph } from "@/components/display/text"
import { Checkbox } from "@/components/form/checkbox"
import { FormLabel } from "@/components/form/form-label"
import { Input } from "@/components/form/input"
import { Radio } from "@/components/form/radio"
import { Tabs } from "@/components/layout/tabs"
import { Drawer } from "@/components/overlays/drawer"
import { streamStatusLabel, streamPrivacyLabel } from "@/types/broadcast/stream-constants"
import type { StreamStatus, StreamPrivacy } from "@/types/broadcast/stream"
import { RotateCcw, X } from "lucide-react"
import type { useStreamFilters } from "./use-stream-filters"

type StreamFilterDrawerProps = {
  filters: ReturnType<typeof useStreamFilters>
}

const statuses: StreamStatus[] = ["created", "ready", "live"]
const privacies: StreamPrivacy[] = ["public", "private", "unlisted"]

export function StreamFilterDrawer({ filters }: StreamFilterDrawerProps) {
  const {
    filters: state,
    toggleStatus,
    togglePrivacy,
    setScheduledDateRange,
    setShowCompleted,
    setSort,
    reset,
    hasActiveFilters,
  } = filters

  const sortValue = `${state.sortField}-${state.sortDirection}`

  return (
    <Drawer.Portal>
      <Drawer.Backdrop />
      <Drawer.Panel>
        <Drawer.Header>
          <div className="flex-1">
            <Label.md>Filter & Sort</Label.md>
            <Paragraph.xs className="text-tertiary">Narrow down and order your streams</Paragraph.xs>
          </div>
          <Drawer.Close>
            <Button.Icon variant="ghost" icon={<X />} />
          </Drawer.Close>
        </Drawer.Header>

        <Drawer.Content>
          <Tabs defaultTab="filters">
            <Tabs.List>
              <Tabs.Tab value="filters">
                <Label.sm>Filters</Label.sm>
              </Tabs.Tab>
              <Tabs.Tab value="sort">
                <Label.sm>Sort</Label.sm>
              </Tabs.Tab>
            </Tabs.List>
            <Tabs.Panels>
              {/* ── Filters ── */}
              <Tabs.Panel value="filters">
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Status</Paragraph.sm>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    {statuses.map((status) => (
                      <Checkbox
                        key={status}
                        checked={state.statuses.has(status)}
                        onChange={() => toggleStatus(status)}
                      >
                        <FormLabel label={streamStatusLabel[status]} />
                      </Checkbox>
                    ))}
                  </div>
                </div>
                <Divider className="px-4" />
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Visibility</Paragraph.sm>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    {privacies.map((privacy) => (
                      <Checkbox
                        key={privacy}
                        checked={state.privacies.has(privacy)}
                        onChange={() => togglePrivacy(privacy)}
                      >
                        <FormLabel label={streamPrivacyLabel[privacy]} />
                      </Checkbox>
                    ))}
                  </div>
                </div>
                <Divider className="px-4" />
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Scheduled Date</Paragraph.sm>
                  <div className="flex gap-2 px-3">
                    <label className="space-y-1 *:odd:ml-1">
                      <FormLabel label="From" />
                      <Input
                        type="date"
                        value={state.scheduledDateRange.start}
                        onChange={(e) => setScheduledDateRange(e.target.value, state.scheduledDateRange.end)}
                      />
                    </label>
                    <label className="space-y-1 *:odd:ml-1">
                      <FormLabel label="To" />
                      <Input
                        type="date"
                        value={state.scheduledDateRange.end}
                        onChange={(e) => setScheduledDateRange(state.scheduledDateRange.start, e.target.value)}
                      />
                    </label>
                  </div>
                </div>
                <Divider className="px-4" />
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Completed Streams</Paragraph.sm>
                  <div className="px-3">
                    <Checkbox
                      checked={state.showCompleted}
                      onChange={(e) => setShowCompleted(e.target.checked)}
                    >
                      <FormLabel label="Show completed streams" />
                    </Checkbox>
                  </div>
                </div>
              </Tabs.Panel>

              {/* ── Sort ── */}
              <Tabs.Panel value="sort">
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Title</Paragraph.sm>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    <Radio name="stream-sort" value="title-asc" checked={sortValue === "title-asc"} onChange={() => setSort("title", "asc")}>
                      <FormLabel label="A–Z" />
                    </Radio>
                    <Radio name="stream-sort" value="title-desc" checked={sortValue === "title-desc"} onChange={() => setSort("title", "desc")}>
                      <FormLabel label="Z–A" />
                    </Radio>
                  </div>
                </div>
                <Divider className="px-4" />
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Scheduled Date</Paragraph.sm>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    <Radio name="stream-sort" value="scheduledStartTime-asc" checked={sortValue === "scheduledStartTime-asc"} onChange={() => setSort("scheduledStartTime", "asc")}>
                      <FormLabel label="Earliest first" />
                    </Radio>
                    <Radio name="stream-sort" value="scheduledStartTime-desc" checked={sortValue === "scheduledStartTime-desc"} onChange={() => setSort("scheduledStartTime", "desc")}>
                      <FormLabel label="Latest first" />
                    </Radio>
                  </div>
                </div>
                <Divider className="px-4" />
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Created Date</Paragraph.sm>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    <Radio name="stream-sort" value="createdAt-asc" checked={sortValue === "createdAt-asc"} onChange={() => setSort("createdAt", "asc")}>
                      <FormLabel label="Oldest first" />
                    </Radio>
                    <Radio name="stream-sort" value="createdAt-desc" checked={sortValue === "createdAt-desc"} onChange={() => setSort("createdAt", "desc")}>
                      <FormLabel label="Newest first" />
                    </Radio>
                  </div>
                </div>
                <Divider className="px-4" />
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Status</Paragraph.sm>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    <Radio name="stream-sort" value="status-asc" checked={sortValue === "status-asc"} onChange={() => setSort("status", "asc")}>
                      <FormLabel label="A–Z" />
                    </Radio>
                    <Radio name="stream-sort" value="status-desc" checked={sortValue === "status-desc"} onChange={() => setSort("status", "desc")}>
                      <FormLabel label="Z–A" />
                    </Radio>
                  </div>
                </div>
              </Tabs.Panel>
            </Tabs.Panels>
          </Tabs>
        </Drawer.Content>

        <Drawer.Footer className="*:w-full">
          {hasActiveFilters && (
            <Button variant="secondary" icon={<RotateCcw />} className="w-full" onClick={reset}>
              Reset
            </Button>
          )}
          <Drawer.Close>
            <Button className="w-full">Done</Button>
          </Drawer.Close>
        </Drawer.Footer>
      </Drawer.Panel>
    </Drawer.Portal>
  )
}
