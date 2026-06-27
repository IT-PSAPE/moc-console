import { Button } from "@moc/ui/components/controls/button"
import { Divider } from "@moc/ui/components/display/divider"
import { Label, Paragraph } from "@moc/ui/components/display/text"
import { Checkbox } from "@moc/ui/components/form/checkbox"
import { FormLabel } from "@moc/ui/components/form/form-label"
import { Input } from "@moc/ui/components/form/input"
import { Radio, RadioGroup } from "@moc/ui/components/form/radio"
import { Tabs } from "@moc/ui/components/layout/tabs"
import { Drawer } from "@moc/ui/components/overlays/drawer"
import { zoomRecurrenceLabel } from "@moc/types/broadcast/zoom-constants"
import type { ZoomRecurrenceType } from "@moc/types/broadcast/zoom"
import { RotateCcw, X } from "lucide-react"
import type { useZoomMeetingFilters } from "./use-zoom-meeting-filters"

type ZoomMeetingFilterDrawerProps = {
  filters: ReturnType<typeof useZoomMeetingFilters>
}

const recurrenceTypes: ZoomRecurrenceType[] = ["none", "daily", "weekly", "monthly"]

export function ZoomMeetingFilterDrawer({ filters }: ZoomMeetingFilterDrawerProps) {
  const {
    filters: state,
    toggleRecurrenceType,
    setDateRange,
    setShowPast,
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
            <Paragraph.xs className="text-tertiary">Narrow down and order your meetings</Paragraph.xs>
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
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Recurrence</Paragraph.sm>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    {recurrenceTypes.map((type) => (
                      <Checkbox
                        key={type}
                        checked={state.recurrenceTypes.has(type)}
                        onChange={() => toggleRecurrenceType(type)}
                      >
                        <FormLabel label={zoomRecurrenceLabel[type]} />
                      </Checkbox>
                    ))}
                  </div>
                </div>
                <Divider className="px-4" />
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Start Date</Paragraph.sm>
                  <div className="flex gap-2 px-3">
                    <label className="space-y-1 *:odd:ml-1">
                      <FormLabel label="From" />
                      <Input
                        type="date"
                        value={state.dateRange.start}
                        onChange={(e) => setDateRange(e.target.value, state.dateRange.end)}
                      />
                    </label>
                    <label className="space-y-1 *:odd:ml-1">
                      <FormLabel label="To" />
                      <Input
                        type="date"
                        value={state.dateRange.end}
                        onChange={(e) => setDateRange(state.dateRange.start, e.target.value)}
                      />
                    </label>
                  </div>
                </div>
                <Divider className="px-4" />
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Past Meetings</Paragraph.sm>
                  <div className="px-3">
                    <Checkbox
                      checked={state.showPast}
                      onChange={(e) => setShowPast(e.target.checked)}
                    >
                      <FormLabel label="Show past one-time meetings" />
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
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Topic</Paragraph.sm>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    <Radio value="topic-asc">
                      <FormLabel label="A–Z" />
                    </Radio>
                    <Radio value="topic-desc">
                      <FormLabel label="Z–A" />
                    </Radio>
                  </div>
                </div>
                <Divider className="px-4" />
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Start Time</Paragraph.sm>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    <Radio value="startTime-asc">
                      <FormLabel label="Earliest first" />
                    </Radio>
                    <Radio value="startTime-desc">
                      <FormLabel label="Latest first" />
                    </Radio>
                  </div>
                </div>
                <Divider className="px-4" />
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Duration</Paragraph.sm>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    <Radio value="duration-asc">
                      <FormLabel label="Shortest first" />
                    </Radio>
                    <Radio value="duration-desc">
                      <FormLabel label="Longest first" />
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
