import type { FormEvent } from "react"
import { RequestBasicInfo } from "@/features/components/request-basic-info"
import { RequestDetails } from "@/features/components/request-details"
import { RequestFlow } from "@/features/components/request-flow"
import { StepErrorSummary } from "@/features/components/step-error-summary"
import { TrackingEditorActions } from "@/features/components/tracking-editor-actions"
import { RetryAlert } from "@moc/ui/components/feedback/retry-alert"
import { useTrackingRequestEditor } from "@/features/hooks/use-tracking-request-editor"
import type { TrackingRequestResult, TrackingResult } from "@/types/tracking"

type TrackingRequestEditorProps = {
  result: TrackingRequestResult
  onSaved: (submission: TrackingResult) => void
  onCancel: () => void
}

export function TrackingRequestEditor({ result, onSaved, onCancel }: TrackingRequestEditorProps) {
  const editor = useTrackingRequestEditor(result, onSaved)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void editor.actions.save()
  }

  return (
    <form className="flex flex-col gap-8" noValidate onSubmit={handleSubmit}>
      <StepErrorSummary errors={editor.state.validationErrors} />
      {editor.state.categoriesError && <RetryAlert title="Request categories unavailable" description="Your current category stays selected. Retry to load other choices." onRetry={editor.actions.retryCategories} isRetrying={editor.state.categoriesLoading} />}
      <RequestBasicInfo data={editor.state.data} categories={editor.state.categories} categoryUnavailable={editor.state.categoryAvailability.unavailable} categoryPlaceholder={editor.state.categoryAvailability.placeholder} onChange={editor.actions.setField} errors={editor.state.validationErrors} />
      <RequestDetails data={editor.state.data} onChange={editor.actions.setField} errors={editor.state.validationErrors} />
      <RequestFlow data={editor.state.data} onChange={editor.actions.setField} />
      <TrackingEditorActions saving={editor.state.saving} error={editor.state.error} onCancel={onCancel} />
    </form>
  )
}
