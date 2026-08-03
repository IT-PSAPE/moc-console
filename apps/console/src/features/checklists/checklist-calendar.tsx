import { useMemo } from "react"
import { routes } from "@/screens/console-routes"
import { ResponsiveDrawerTrigger } from "@/features/responsive-drawer-trigger"
import { Calendar, type CalendarEvent } from "@moc/ui/components/display/calendar"
import { Drawer } from "@moc/ui/components/overlays/drawer"
import type { Checklist } from "@moc/types/checklists"
import { ChecklistDrawer } from "./checklist-drawer"
import { getChecklistCounts } from "./checklist-content"

function toCalendarEvents(checklists: Checklist[]): CalendarEvent<Checklist>[] {
  return checklists.flatMap((checklist) => {
    if (!checklist.scheduledAt) return []
    const { checked, total } = getChecklistCounts(checklist)
    const isComplete = total > 0 && checked === total

    return [{
      id: checklist.id,
      date: new Date(checklist.scheduledAt),
      label: checklist.name,
      color: isComplete ? "green" : "blue",
      data: checklist,
    }]
  })
}

export function ChecklistCalendarView({ checklists }: { checklists: Checklist[] }) {
  const events = useMemo(() => toCalendarEvents(checklists), [checklists])

  function renderChecklist(event: CalendarEvent<Checklist>) {
    const checklist = event.data
    if (!checklist) return null

    return (
      <Drawer key={checklist.id}>
        <ResponsiveDrawerTrigger mobileHref={`/${routes.checklists}/${checklist.id}`} className="w-full rounded text-left">
          <Calendar.Event color={event.color}>{event.label}</Calendar.Event>
        </ResponsiveDrawerTrigger>
        <ChecklistDrawer checklist={checklist} />
      </Drawer>
    )
  }

  return <Calendar events={events} renderEvent={renderChecklist} />
}
