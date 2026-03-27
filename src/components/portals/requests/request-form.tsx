import { Modal } from '@/components/ui/modal'
import { FormWizard } from '@/components/ui/form-wizard'
import { RequestFormBasicsStep } from './request-form-basics-step'
import { RequestFormBriefStep } from './request-form-brief-step'
import { RequestFormResourcesStep } from './request-form-resources-step'
import { RequestFormReviewStep } from './request-form-review-step'
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
        <FormWizard.Root
          currentStep={step}
          totalSteps={REQUEST_STEPS.length}
          onNext={goNext}
          onBack={goBack}
        >
          <FormWizard.StepIndicator labels={REQUEST_STEPS} />
          <FormWizard.Step index={0}>
            <RequestFormBasicsStep form={form} noticeAlert={noticeAlert} onFieldChange={setField} />
          </FormWizard.Step>
          <FormWizard.Step index={1}>
            <RequestFormBriefStep form={form} onFieldChange={setField} />
          </FormWizard.Step>
          <FormWizard.Step index={2}>
            <RequestFormResourcesStep
              form={form}
              venues={supportData?.venues ?? []}
              equipment={supportData?.equipment ?? []}
              media={supportData?.media ?? []}
              onToggleVenue={toggleVenue}
              onToggleEquipment={toggleEquipment}
              onToggleMedia={toggleMedia}
            />
          </FormWizard.Step>
          <FormWizard.Step index={3}>
            <RequestFormReviewStep
              form={form}
              venues={supportData?.venues ?? []}
              equipment={supportData?.equipment ?? []}
              media={supportData?.media ?? []}
            />
          </FormWizard.Step>
          <FormWizard.Navigation
            canAdvance={canAdvance}
            isSubmitting={isPending}
            submitLabel="Submit Request"
            onCancel={handleDismiss}
            onSubmit={submit}
          />
        </FormWizard.Root>
      </Modal.Body>
    </Modal.Root>
  )
}
