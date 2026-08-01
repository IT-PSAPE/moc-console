import { useCallback, useEffect, useState, type ChangeEvent } from "react"
import { captureBugReportContext, submitBugReport, type BugReportErrorContext } from "@/data/bug-reports"
import { useAuth } from "@/lib/auth-context"
import { useFeedback } from "@moc/ui/components/feedback/feedback-provider"

export const BUG_REPORT_MAX_LENGTH = 2000
export const BUG_REPORT_MIN_LENGTH = 10

export function useReportBugForm(open: boolean, onOpenChange: (open: boolean) => void, errorContext?: BugReportErrorContext | null) {
  const { profile } = useAuth()
  const { toast } = useFeedback()
  const [description, setDescription] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const trimmedLength = description.trim().length
  const canSubmit = Boolean(!isSubmitting && trimmedLength >= BUG_REPORT_MIN_LENGTH && trimmedLength <= BUG_REPORT_MAX_LENGTH && profile)

  useEffect(() => {
    if (open) return
    setDescription("")
    setIsSubmitting(false)
  }, [open])

  const submit = useCallback(async () => {
    if (!profile || !canSubmit) return
    setIsSubmitting(true)
    try {
      await submitBugReport({
        userId: profile.id,
        description: description.trim(),
        ...captureBugReportContext(),
        errorContext: errorContext ?? null,
      })
      toast({ title: "Bug report sent", variant: "success" })
      onOpenChange(false)
    } catch (error) {
      toast({ title: "Could not send report", description: error instanceof Error ? error.message : "Please try again.", variant: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }, [canSubmit, description, errorContext, onOpenChange, profile, toast])

  function changeDescription(event: ChangeEvent<HTMLTextAreaElement>) {
    setDescription(event.target.value)
  }

  return {
    state: { description, isSubmitting },
    actions: { changeDescription, submit },
    meta: { trimmedLength, remaining: BUG_REPORT_MAX_LENGTH - description.length, canSubmit },
  }
}
