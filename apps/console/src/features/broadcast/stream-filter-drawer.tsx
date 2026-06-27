import { Button } from "@moc/ui/components/controls/button"
import { Divider } from "@moc/ui/components/display/divider"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { Checkbox } from "@moc/ui/components/form/checkbox"
import { FormLabel } from "@moc/ui/components/form/form-label"
import { Input } from "@moc/ui/components/form/input"
import { Radio, RadioGroup } from "@moc/ui/components/form/radio"
import { Tabs } from "@moc/ui/components/layout/tabs"
import { Drawer } from "@moc/ui/components/overlays/drawer"
import { streamStatusLabel, streamPrivacyLabel } from "@moc/types/broadcast/stream-constants"
import type { StreamStatus, StreamPrivacy } from "@moc/types/broadcast/stream"
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
                <RadioGroup
                  value={sortValue}
                  onValueChange={(value) => {
                    const i = value.lastIndexOf("-");
                    setSort(value.slice(0, i) as Parameters<typeof setSort>[0], value.slice(i + 1) as Parameters<typeof setSort>[1]);
                  }}
                >
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Title</Paragraph.sm>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    <Radio value="title-asc">
                      <FormLabel label="A–Z" />
                    </Radio>
                    <Radio value="title-desc">
                      <FormLabel label="Z–A" />
                    </Radio>
                  </div>
                </div>
                <Divider className="px-4" />
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Scheduled Date</Paragraph.sm>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    <Radio value="scheduledStartTime-asc">
                      <FormLabel label="Earliest first" />
                    </Radio>
                    <Radio value="scheduledStartTime-desc">
                      <FormLabel label="Latest first" />
                    </Radio>
                  </div>
                </div>
                <Divider className="px-4" />
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Created Date</Paragraph.sm>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    <Radio value="createdAt-asc">
                      <FormLabel label="Oldest first" />
                    </Radio>
                    <Radio value="createdAt-desc">
                      <FormLabel label="Newest first" />
                    </Radio>
                  </div>
                </div>
                <Divider className="px-4" />
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Status</Paragraph.sm>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    <Radio value="status-asc">
                      <FormLabel label="A–Z" />
                    </Radio>
                    <Radio value="status-desc">
                      <FormLabel label="Z–A" />
                    </Radio>
                  </div>
                </div>
                </RadioGroup>
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
