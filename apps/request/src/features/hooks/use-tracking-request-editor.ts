import { useCallback, useMemo, useState } from "react"
import { updateTrackedRequest } from "@/data/tracking-submissions"
import { getRequestStepErrors } from "@/features/public-flow-validation"
import { toRequestEditData } from "@/features/tracking-submission"
import { useRequestCategories } from "@/features/hooks/use-request-categories"
import { useStepValidation } from "@/features/hooks/use-step-validation"
import type { RequestFormData } from "@/types/request"
import type { TrackingRequestResult, TrackingResult } from "@/types/tracking"

export function useTrackingRequestEditor(result: TrackingRequestResult, onSaved: (submission: TrackingResult) => void) {
  const [data, setData] = useState<RequestFormData>(() => toRequestEditData(result))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const validation = useStepValidation()
  const categoryOptions = useRequestCategories()
  const categories = useMemo(() => categoryOptions.state.categories.some((category) => category.value === result.category)
    ? categoryOptions.state.categories
    : [{ value: result.category, label: result.categoryName }, ...categoryOptions.state.categories], [categoryOptions.state.categories, result.category, result.categoryName])

  const setField = useCallback((field: keyof RequestFormData, value: string) => {
    setData((current) => ({ ...current, [field]: value }))
  }, [])

  const save = useCallback(async () => {
    const errors = { ...getRequestStepErrors(1, data), ...getRequestStepErrors(2, data) }
    if (!validation.actions.validate(errors)) return

    setSaving(true)
    setError(null)
    try {
      onSaved(await updateTrackedRequest(result, data))
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to update the request")
    } finally {
      setSaving(false)
    }
  }, [data, onSaved, result, validation.actions])

  return {
    state: { data, categories, saving, error: error ?? categoryOptions.state.error, validationErrors: validation.state.errors },
    actions: { setField, save },
  }
}
