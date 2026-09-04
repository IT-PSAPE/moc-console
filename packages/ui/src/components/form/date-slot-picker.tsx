import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { cn } from '@moc/utils/cn'
import { Button } from '@moc/ui/components/controls/button'
import { InteractiveSurface } from '@moc/ui/components/controls/interactive-surface'
import { ScrollArea } from '@moc/ui/components/display/scroll-area'
import { Calendar } from '@moc/ui/components/display/calendar'
import { EmptyState } from '@moc/ui/components/feedback/empty-state'
import { Spinner } from '@moc/ui/components/feedback/spinner'

// A cal.com-style date + time picker: a month calendar on the left, the
// selected day's slots in a scrollable column on the right (stacked
// vertically on mobile). It knows nothing about what a "slot" represents —
// every label, slot and selection comes in via props/composition, so it can
// be reused for any domain that needs to pick one contiguous run of slots on
// a single day.

// ─── Types ───────────────────────────────────────────────

export type DateSlotPickerSlotData = {
  id: string
  label: string
  available: boolean
}

type DateSlotPickerContextValue = {
  state: {
    selectedDate: Date | null
    selectedSlotIds: string[]
  }
  actions: {
    selectDate: (date: Date) => void
    selectSlot: (id: string) => void
  }
  meta: {
    slots: DateSlotPickerSlotData[]
  }
}

// ─── Pure helpers ────────────────────────────────────────
// Kept outside the components so the range maths can be reasoned about (and
// tested) independently of React and rendering.

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

/**
 * Clicking a free slot starts a single-slot selection. Clicking a second free
 * slot extends the run to it, but only when every slot in between is also
 * available — otherwise the extension is refused and the selection is left
 * unchanged. Clicking the single selected slot again clears it. Clicking any
 * slot while a multi-slot range is already selected starts a fresh
 * single-slot selection at that slot.
 */
export function computeSlotRangeSelection(slots: DateSlotPickerSlotData[], selectedIds: string[], clickedId: string): string[] {
  const clickedSlot = slots.find((slot) => slot.id === clickedId)
  if (!clickedSlot || !clickedSlot.available) return selectedIds

  if (selectedIds.length === 1 && selectedIds[0] === clickedId) return []
  if (selectedIds.length !== 1) return [clickedId]

  const anchorIndex = slots.findIndex((slot) => slot.id === selectedIds[0])
  const clickedIndex = slots.findIndex((slot) => slot.id === clickedId)
  if (anchorIndex === -1 || clickedIndex === -1) return [clickedId]

  const start = Math.min(anchorIndex, clickedIndex)
  const end = Math.max(anchorIndex, clickedIndex)
  const range = slots.slice(start, end + 1)

  return range.every((slot) => slot.available) ? range.map((slot) => slot.id) : selectedIds
}

// ─── Context ─────────────────────────────────────────────

const DateSlotPickerContext = createContext<DateSlotPickerContextValue | null>(null)

function useDateSlotPickerContext(): DateSlotPickerContextValue {
  const context = useContext(DateSlotPickerContext)
  if (!context) throw new Error('DateSlotPicker subcomponents must be rendered inside DateSlotPicker.Root')
  return context
}

// ─── Root ────────────────────────────────────────────────

type DateSlotPickerRootProps = {
  children: ReactNode
  className?: string
  selectedDate: Date | null
  onSelectDate: (date: Date) => void
  slots: DateSlotPickerSlotData[]
  selectedSlotIds: string[]
  onSelectedSlotIdsChange: (ids: string[]) => void
}

function DateSlotPickerRoot({ children, className, selectedDate, onSelectDate, slots, selectedSlotIds, onSelectedSlotIdsChange }: DateSlotPickerRootProps) {
  const selectSlot = useCallback((id: string) => {
    onSelectedSlotIdsChange(computeSlotRangeSelection(slots, selectedSlotIds, id))
  }, [slots, selectedSlotIds, onSelectedSlotIdsChange])

  const value = useMemo<DateSlotPickerContextValue>(() => ({
    state: { selectedDate, selectedSlotIds },
    actions: { selectDate: onSelectDate, selectSlot },
    meta: { slots },
  }), [selectedDate, selectedSlotIds, onSelectDate, selectSlot, slots])

  return (
    <DateSlotPickerContext.Provider value={value}>
      <div className={cn('grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]', className)}>
        {children}
      </div>
    </DateSlotPickerContext.Provider>
  )
}

// ─── Calendar ────────────────────────────────────────────

type DateSlotPickerCalendarProps = {
  className?: string
  defaultMonth?: Date
  isDateDisabled?: (date: Date) => boolean
}

function DateSlotPickerCalendar({ className, defaultMonth, isDateDisabled }: DateSlotPickerCalendarProps) {
  const { state, actions } = useDateSlotPickerContext()

  function renderDay({ date, isCurrentMonth, isToday }: { date: Date; isCurrentMonth: boolean; isToday: boolean }) {
    const disabled = Boolean(isDateDisabled?.(date))
    const isSelected = state.selectedDate !== null && isSameCalendarDay(date, state.selectedDate)

    function handleSelect() {
      actions.selectDate(date)
    }

    return (
      <InteractiveSurface
        aria-pressed={isSelected}
        aria-label={date.toDateString()}
        disabled={disabled}
        className={cn(
          'flex min-h-12 w-full items-center justify-center paragraph-sm disabled:cursor-not-allowed',
          isCurrentMonth && !isSelected && !disabled && 'text-primary hover:bg-primary_hover',
          !isCurrentMonth && !isSelected && 'text-quaternary',
          isToday && !isSelected && 'font-semibold text-brand_secondary',
          isSelected && 'bg-brand_solid text-primary_on-brand hover:bg-brand_solid',
          disabled && 'text-disabled opacity-50 hover:bg-transparent',
        )}
        onClick={handleSelect}
      >
        {date.getDate()}
      </InteractiveSurface>
    )
  }

  return <Calendar className={className} defaultMonth={defaultMonth} renderDay={renderDay} />
}

// ─── Slots ───────────────────────────────────────────────

type DateSlotPickerSlotsProps = {
  children: ReactNode
  className?: string
  'aria-label'?: string
}

function DateSlotPickerSlots({ children, className, 'aria-label': ariaLabel = 'Available times' }: DateSlotPickerSlotsProps) {
  return (
    <ScrollArea className={cn('h-72 lg:h-full lg:min-h-96', className)}>
      <ScrollArea.Viewport>
        <ScrollArea.Content aria-label={ariaLabel} role="group" className="flex flex-col gap-2 p-1">
          {children}
        </ScrollArea.Content>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar>
        <ScrollArea.Thumb />
      </ScrollArea.Scrollbar>
    </ScrollArea>
  )
}

// ─── Slot ────────────────────────────────────────────────

type DateSlotPickerSlotProps = {
  id: string
  label: string
  available: boolean
}

function DateSlotPickerSlot({ id, label, available }: DateSlotPickerSlotProps) {
  const { state, actions } = useDateSlotPickerContext()
  const isSelected = state.selectedSlotIds.includes(id)

  function handleClick() {
    actions.selectSlot(id)
  }

  return (
    <Button
      variant={isSelected ? 'primary' : 'secondary'}
      disabled={!available}
      aria-pressed={isSelected}
      aria-label={available ? label : `${label}, unavailable`}
      className="w-full justify-center"
      onClick={handleClick}
    >
      {label}
    </Button>
  )
}

// ─── Status (loading / empty) ───────────────────────────
// Reused rather than reinvented: the consumer supplies the copy, this just
// composes the shared feedback primitives.

function DateSlotPickerLoading({ label = 'Loading times' }: { label?: string }) {
  return (
    <div className="flex h-full items-center justify-center py-10">
      <Spinner size="md" aria-label={label} />
    </div>
  )
}

type DateSlotPickerEmptyProps = {
  icon?: ReactNode
  title: string
  description?: string
}

function DateSlotPickerEmpty({ icon, title, description }: DateSlotPickerEmptyProps) {
  return <EmptyState icon={icon} title={title} description={description} className="py-10" />
}

// ─── Compound export ─────────────────────────────────────

export const DateSlotPicker = {
  Root: DateSlotPickerRoot,
  Calendar: DateSlotPickerCalendar,
  Slots: DateSlotPickerSlots,
  Slot: DateSlotPickerSlot,
  Loading: DateSlotPickerLoading,
  Empty: DateSlotPickerEmpty,
}
