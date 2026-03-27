import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateRequest } from '@/hooks/use-requests'
import type { RequestType, CultureRequest } from '@/types'

interface RequestFormProps {
  open: boolean
  onClose: () => void
}

interface FormState {
  title: string
  type: RequestType
  priority: CultureRequest['priority']
  due_date: string
  who: string
  what: string
  when: string
  where: string
  why: string
  how: string
  requester_email: string
}

const INITIAL_FORM: FormState = {
  title: '',
  type: 'event',
  priority: 'medium',
  due_date: '',
  who: '',
  what: '',
  when: '',
  where: '',
  why: '',
  how: '',
  requester_email: '',
}

const STEPS = ['Basics', '5W + 1H', 'Review']

const TYPE_OPTIONS: { label: string; value: RequestType }[] = [
  { label: 'Event', value: 'event' },
  { label: 'Program', value: 'program' },
  { label: 'Venue', value: 'venue' },
  { label: 'Equipment', value: 'equipment' },
  { label: 'Media', value: 'media' },
  { label: 'Other', value: 'other' },
]

const PRIORITY_OPTIONS: { label: string; value: CultureRequest['priority'] }[] = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Urgent', value: 'urgent' },
]

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${i < current ? 'bg-background-brand_solid text-white' : i === current ? 'border-2 border-background-brand_solid text-text-brand' : 'border border-border-secondary text-text-quaternary'}`}>
            {i < current ? '✓' : i + 1}
          </div>
          <span className={`text-xs ${i === current ? 'text-text-primary font-medium' : 'text-text-quaternary'}`}>{label}</span>
          {i < total - 1 && <div className="h-px w-6 bg-border-secondary" />}
        </div>
      ))}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-0.5 text-sm font-medium text-text-secondary">{children}</p>
}

function FieldValue({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-text-tertiary">{children || <span className="italic text-text-placeholder">Not provided</span>}</p>
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2 border-b border-border-secondary last:border-0">
      <FieldLabel>{label}</FieldLabel>
      <FieldValue>{value}</FieldValue>
    </div>
  )
}

export function RequestForm({ open, onClose }: RequestFormProps) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const { mutate: createRequest, isPending } = useCreateRequest()

  function handleClose() {
    setStep(0)
    setForm(INITIAL_FORM)
    onClose()
  }

  function handleNext() {
    setStep((s) => s + 1)
  }

  function handleBack() {
    setStep((s) => s - 1)
  }

  function handleSubmit() {
    createRequest(
      {
        title: form.title,
        type: form.type,
        priority: form.priority,
        due_date: form.due_date || undefined,
        who: form.who,
        what: form.what,
        when: form.when,
        where: form.where,
        why: form.why,
        how: form.how,
        requester_email: form.requester_email,
        status: 'pending',
      },
      { onSuccess: handleClose },
    )
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, title: e.target.value }))
  }

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, requester_email: e.target.value }))
  }

  function handleDueDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, due_date: e.target.value }))
  }

  function handleTypeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setForm((f) => ({ ...f, type: e.target.value as RequestType }))
  }

  function handlePriorityChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setForm((f) => ({ ...f, priority: e.target.value as CultureRequest['priority'] }))
  }

  function handleWhoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, who: e.target.value }))
  }

  function handleWhatChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, what: e.target.value }))
  }

  function handleWhenChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, when: e.target.value }))
  }

  function handleWhereChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, where: e.target.value }))
  }

  function handleWhyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, why: e.target.value }))
  }

  function handleHowChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, how: e.target.value }))
  }

  const selectClass = 'h-10 w-full rounded-lg border border-border-primary bg-background-primary px-3 text-sm text-text-primary outline-none focus:border-border-brand'
  const textareaClass = 'w-full rounded-lg border border-border-primary bg-background-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-placeholder outline-none focus:border-border-brand resize-none'

  const canAdvanceStep0 = form.title.trim() && form.requester_email.trim()
  const canAdvanceStep1 = form.who.trim() && form.what.trim() && form.when.trim() && form.where.trim() && form.why.trim() && form.how.trim()

  return (
    <Modal.Root open={open} onClose={handleClose}>
      <Modal.Header>New Request</Modal.Header>
      <Modal.Body>
        <StepIndicator current={step} total={STEPS.length} />

        {step === 0 && (
          <div className="space-y-4">
            <Input
              label="Request Title"
              id="req-title"
              placeholder="Brief descriptive title"
              value={form.title}
              onChange={handleTitleChange}
            />
            <Input
              label="Requester Email"
              id="req-email"
              type="email"
              placeholder="requester@culture.gov"
              value={form.requester_email}
              onChange={handleEmailChange}
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="req-type" className="mb-1.5 block text-sm text-text-tertiary">Type</label>
                <select id="req-type" className={selectClass} value={form.type} onChange={handleTypeChange}>
                  {TYPE_OPTIONS.map(({ label, value }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="req-priority" className="mb-1.5 block text-sm text-text-tertiary">Priority</label>
                <select id="req-priority" className={selectClass} value={form.priority} onChange={handlePriorityChange}>
                  {PRIORITY_OPTIONS.map(({ label, value }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <Input
              label="Due Date"
              id="req-due"
              type="date"
              value={form.due_date}
              onChange={handleDueDateChange}
            />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Input
              label="Who — Requester / Owner"
              id="req-who"
              placeholder="Name and department"
              value={form.who}
              onChange={handleWhoChange}
            />
            <div>
              <label htmlFor="req-what" className="mb-1.5 block text-sm text-text-tertiary">What — What is needed?</label>
              <textarea id="req-what" className={textareaClass} rows={2} placeholder="Describe the resource, space, or support required" value={form.what} onChange={handleWhatChange} />
            </div>
            <Input
              label="When — Desired date or period"
              id="req-when"
              placeholder="e.g. 2026-05-15 or April 1–30"
              value={form.when}
              onChange={handleWhenChange}
            />
            <Input
              label="Where — Location or venue"
              id="req-where"
              placeholder="Building, hall, or address"
              value={form.where}
              onChange={handleWhereChange}
            />
            <div>
              <label htmlFor="req-why" className="mb-1.5 block text-sm text-text-tertiary">Why — Purpose / rationale</label>
              <textarea id="req-why" className={textareaClass} rows={2} placeholder="Why is this request needed?" value={form.why} onChange={handleWhyChange} />
            </div>
            <div>
              <label htmlFor="req-how" className="mb-1.5 block text-sm text-text-tertiary">How — Method / delivery</label>
              <textarea id="req-how" className={textareaClass} rows={2} placeholder="How will this be delivered or executed?" value={form.how} onChange={handleHowChange} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="mb-3 text-sm text-text-tertiary">Review before submitting</p>
            <div className="rounded-lg border border-border-secondary px-4">
              <ReviewRow label="Title" value={form.title} />
              <ReviewRow label="Type" value={form.type} />
              <ReviewRow label="Priority" value={form.priority} />
              <ReviewRow label="Due Date" value={form.due_date} />
              <ReviewRow label="Requester Email" value={form.requester_email} />
              <ReviewRow label="Who" value={form.who} />
              <ReviewRow label="What" value={form.what} />
              <ReviewRow label="When" value={form.when} />
              <ReviewRow label="Where" value={form.where} />
              <ReviewRow label="Why" value={form.why} />
              <ReviewRow label="How" value={form.how} />
            </div>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        {step > 0 && (
          <Button variant="secondary" size="sm" onClick={handleBack}>Back</Button>
        )}
        <Button variant="secondary" size="sm" onClick={handleClose}>Cancel</Button>
        {step < 2 && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleNext}
            disabled={step === 0 ? !canAdvanceStep0 : !canAdvanceStep1}
          >
            Next
          </Button>
        )}
        {step === 2 && (
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Submitting…' : 'Submit Request'}
          </Button>
        )}
      </Modal.Footer>
    </Modal.Root>
  )
}
