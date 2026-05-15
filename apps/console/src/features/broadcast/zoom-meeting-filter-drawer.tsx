import { Button } from "@/components/controls/button"
import { Divider } from "@/components/display/divider"
import { Label, Paragraph } from "@/components/display/text"
import { Checkbox } from "@/components/form/checkbox"
import { FormLabel } from "@/components/form/form-label"
import { Input } from "@/components/form/input"
import { Radio } from "@/components/form/radio"
import { Tabs } from "@/components/layout/tabs"
import { Drawer } from "@/components/overlays/drawer"
import { zoomRecurrenceLabel } from "@/types/broadcast/zoom-constants"
import type { ZoomRecurrenceType } from "@/types/broadcast/zoom"
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
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Topic</Paragraph.sm>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    <Radio name="meeting-sort" value="topic-asc" checked={sortValue === "topic-asc"} onChange={() => setSort("topic", "asc")}>
                      <FormLabel label="A–Z" />
                    </Radio>
                    <Radio name="meeting-sort" value="topic-desc" checked={sortValue === "topic-desc"} onChange={() => setSort("topic", "desc")}>
                      <FormLabel label="Z–A" />
                    </Radio>
                  </div>
                </div>
                <Divider className="px-4" />
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Start Time</Paragraph.sm>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    <Radio name="meeting-sort" value="startTime-asc" checked={sortValue === "startTime-asc"} onChange={() => setSort("startTime", "asc")}>
                      <FormLabel label="Earliest first" />
                    </Radio>
                    <Radio name="meeting-sort" value="startTime-desc" checked={sortValue === "startTime-desc"} onChange={() => setSort("startTime", "desc")}>
                      <FormLabel label="Latest first" />
                    </Radio>
                  </div>
                </div>
                <Divider className="px-4" />
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Duration</Paragraph.sm>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    <Radio name="meeting-sort" value="duration-asc" checked={sortValue === "duration-asc"} onChange={() => setSort("duration", "asc")}>
                      <FormLabel label="Shortest first" />
                    </Radio>
                    <Radio name="meeting-sort" value="duration-desc" checked={sortValue === "duration-desc"} onChange={() => setSort("duration", "desc")}>
                      <FormLabel label="Longest first" />
                    </Radio>
                  </div>
                </div>
                <Divider className="px-4" />
                <div className="py-2">
                  <Paragraph.sm className="px-3 py-1.5 text-quaternary">Created Date</Paragraph.sm>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    <Radio name="meeting-sort" value="createdAt-asc" checked={sortValue === "createdAt-asc"} onChange={() => setSort("createdAt", "asc")}>
                      <FormLabel label="Oldest first" />
                    </Radio>
                    <Radio name="meeting-sort" value="createdAt-desc" checked={sortValue === "createdAt-desc"} onChange={() => setSort("createdAt", "desc")}>
                      <FormLabel label="Newest first" />
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
