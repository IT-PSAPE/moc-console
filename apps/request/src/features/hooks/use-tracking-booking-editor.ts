import { useCallback, useState } from "react"
import { updateTrackedBooking } from "@/data/tracking-submissions"
import { getBookingStepErrors } from "@/features/public-flow-validation"
import { toBookingEditData } from "@/features/tracking-submission"
import { useStepValidation } from "@/features/hooks/use-step-validation"
import type { BookingFormData } from "@/types/booking"
import type { TrackingBookingResult, TrackingResult } from "@/types/tracking"

export function useTrackingBookingEditor(result: TrackingBookingResult, onSaved: (submission: TrackingResult) => void) {
  const [data, setData] = useState<BookingFormData>(() => toBookingEditData(result))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const validation = useStepValidation()

  const setField = useCallback((field: keyof BookingFormData, value: string) => {
    setData((current) => ({ ...current, [field]: value }))
  }, [])

  const toggleRequestedEquipment = useCallback((label: string) => {
    setData((current) => ({
      ...current,
      requestedEquipment: current.requestedEquipment.includes(label)
        ? current.requestedEquipment.filter((item) => item !== label)
        : [...current.requestedEquipment, label],
    }))
  }, [])

  const save = useCallback(async () => {
    const errors = { ...getBookingStepErrors(1, data), ...getBookingStepErrors(2, data) }
    if (!validation.actions.validate(errors)) return

    setSaving(true)
    setError(null)
    try {
      onSaved(await updateTrackedBooking(result, data))
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update the booking")
    } finally {
      setSaving(false)
    }
  }, [data, onSaved, result, validation.actions])

  return {
    state: { data, saving, error, validationErrors: validation.state.errors },
    actions: { setField, toggleRequestedEquipment, save },
  }
}
