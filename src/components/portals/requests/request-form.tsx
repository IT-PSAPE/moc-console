import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { RequestFormBasicsStep } from './request-form-basics-step'
import { RequestFormBriefStep } from './request-form-brief-step'
import { RequestFormResourcesStep } from './request-form-resources-step'
import { RequestFormReviewStep } from './request-form-review-step'
import { RequestFormStepIndicator } from './request-form-step-indicator'
import { useRequestForm } from './use-request-form'
import { REQUEST_STEPS } from './request-constants'

interface RequestFormProps {
  open: boolean
  onClose: () => void
}

export function RequestForm({ open, onClose }: RequestFormProps) {
  const {
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
  } = useRequestForm({ onSubmitted: onClose })

  function handleDismiss() {
    handleClose(onClose)
  }

  return (
    <Modal.Root open={open} onClose={handleDismiss}>
      <Modal.Header>New Request</Modal.Header>
      <Modal.Body>
        <RequestFormStepIndicator currentStep={step} />
        {step === 0 && (
          <RequestFormBasicsStep form={form} noticeAlert={noticeAlert} onFieldChange={setField} />
        )}
        {step === 1 && <RequestFormBriefStep form={form} onFieldChange={setField} />}
        {step === 2 && (
          <RequestFormResourcesStep
            form={form}
            venues={supportData?.venues ?? []}
            equipment={supportData?.equipment ?? []}
            media={supportData?.media ?? []}
            onToggleVenue={toggleVenue}
            onToggleEquipment={toggleEquipment}
            onToggleMedia={toggleMedia}
          />
        )}
        {step === 3 && (
          <RequestFormReviewStep
            form={form}
            venues={supportData?.venues ?? []}
            equipment={supportData?.equipment ?? []}
            media={supportData?.media ?? []}
          />
        )}
      </Modal.Body>
      <Modal.Footer>
        {step > 0 && (
          <Button variant="secondary" size="sm" onClick={goBack}>
            Back
          </Button>
        )}
        <Button variant="secondary" size="sm" onClick={handleDismiss}>
          Cancel
        </Button>
        {step < REQUEST_STEPS.length - 1 && (
          <Button variant="primary" size="sm" onClick={goNext} disabled={!canAdvance}>
            Next
          </Button>
        )}
        {step === REQUEST_STEPS.length - 1 && (
          <Button variant="primary" size="sm" onClick={submit} disabled={isPending}>
            {isPending ? 'Submitting…' : 'Submit Request'}
          </Button>
        )}
      </Modal.Footer>
    </Modal.Root>
  )
}
