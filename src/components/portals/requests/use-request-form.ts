import { useMemo, useState } from 'react'
import { REQUEST_TYPE_NOTICE } from './request-constants'
import { INITIAL_REQUEST_FORM, type RequestFormState } from './request-form.types'
import { useCreateRequest } from '@/hooks/use-requests'
import { useRequestSupportData } from '@/hooks/use-request-support-data'

interface UseRequestFormOptions {
  onSubmitted: () => void
}

function toggleSelection(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]
}

function getNoticeAlert(form: RequestFormState) {
  if (!form.due_date) return null

  const typeNotice = REQUEST_TYPE_NOTICE[form.type]
  const dueDate = new Date(form.due_date)
  const now = new Date()
  const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < typeNotice.days) {
    return typeNotice.warning
  }

  return null
}

export function useRequestForm({ onSubmitted }: UseRequestFormOptions) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<RequestFormState>(INITIAL_REQUEST_FORM)
  const { mutate: createRequest, isPending } = useCreateRequest()
  const { data: supportData } = useRequestSupportData()

  const noticeAlert = useMemo(() => getNoticeAlert(form), [form])

  const canAdvance = useMemo(() => {
    switch (step) {
      case 0:
        return Boolean(form.title.trim() && form.requester_email.trim())
      case 1:
        return Boolean(form.who.trim() && form.what.trim() && form.when.trim() && form.where.trim() && form.why.trim() && form.how.trim())
      default:
        return true
    }
  }, [form, step])

  function reset() {
    setStep(0)
    setForm(INITIAL_REQUEST_FORM)
  }

  function handleClose(onClose: () => void) {
    reset()
    onClose()
  }

  function setField<K extends keyof RequestFormState>(field: K, value: RequestFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function toggleVenue(id: string) {
    setForm((current) => ({ ...current, venueIds: toggleSelection(current.venueIds, id) }))
  }

  function toggleEquipment(id: string) {
    setForm((current) => ({ ...current, equipmentIds: toggleSelection(current.equipmentIds, id) }))
  }

  function toggleMedia(id: string) {
    setForm((current) => ({ ...current, mediaIds: toggleSelection(current.mediaIds, id) }))
  }

  function goNext() {
    setStep((current) => current + 1)
  }

  function goBack() {
    setStep((current) => current - 1)
  }

  function submit() {
    const venues = supportData?.venues.filter((item) => form.venueIds.includes(item.id)) ?? []
    const equipment = supportData?.equipment.filter((item) => form.equipmentIds.includes(item.id)) ?? []
    const media = supportData?.media.filter((item) => form.mediaIds.includes(item.id)) ?? []

    createRequest(
      {
        title: form.title,
        requester_email: form.requester_email,
        type: form.type,
        priority: form.priority,
        due_date: form.due_date || undefined,
        who: form.who,
        what: form.what,
        when: form.when,
        where: form.where,
        why: form.why,
        how: form.how,
        info: form.info || undefined,
        status: 'pending',
        archived: false,
        venues,
        equipment,
        media,
      },
      {
        onSuccess: () => {
          reset()
          onSubmitted()
        },
      },
    )
  }

  return {
    step,
    form,
    isPending,
    canAdvance,
    noticeAlert,
    supportData,
    setField,
    toggleVenue,
    toggleEquipment,
    toggleMedia,
    goNext,
    goBack,
    submit,
    handleClose,
  }
}
