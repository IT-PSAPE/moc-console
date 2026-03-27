import { createContext, useContext, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface WizardState {
  currentStep: number
  totalSteps: number
}

interface WizardActions {
  goNext: () => void
  goBack: () => void
}

interface WizardContextValue {
  state: WizardState
  actions: WizardActions
}

const WizardContext = createContext<WizardContextValue | null>(null)

function useWizardContext() {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error('FormWizard compounds must be used within FormWizard.Root')
  return ctx
}

function Root({
  currentStep,
  totalSteps,
  onNext,
  onBack,
  children,
}: {
  currentStep: number
  totalSteps: number
  onNext: () => void
  onBack: () => void
  children: ReactNode
}) {
  return (
    <WizardContext.Provider value={{
      state: { currentStep, totalSteps },
      actions: { goNext: onNext, goBack: onBack },
    }}>
      {children}
    </WizardContext.Provider>
  )
}

function StepIndicator({ labels }: { labels: readonly string[] }) {
  const { state: { currentStep } } = useWizardContext()
  const currentLabel = labels[currentStep]

  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-text-quaternary">
            Step {currentStep + 1} of {labels.length}
          </p>
          <h3 className="mt-1 text-base font-semibold text-text-primary">{currentLabel}</h3>
        </div>
        <p className="text-sm text-text-tertiary">
          {Math.round(((currentStep + 1) / labels.length) * 100)}%
        </p>
      </div>

      <div
        aria-label="Form progress"
        className="grid gap-2"
        role="list"
        style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}
      >
        {labels.map((label, i) => {
          const done = i < currentStep
          const active = i === currentStep

          return (
            <div key={label} className="space-y-2" role="listitem">
              <div className={`h-1 rounded-full ${done || active ? 'bg-background-brand_solid' : 'bg-background-secondary'}`} />
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                    done
                      ? 'bg-background-brand_solid text-static-white'
                      : active
                        ? 'border-2 border-border-brand text-foreground-brand_primary'
                        : 'border border-border-secondary text-text-quaternary'
                  }`}
                >
                  {done ? '✓' : i + 1}
                </div>
                <span className={`min-w-0 truncate text-xs ${active ? 'font-medium text-text-primary' : 'text-text-quaternary'}`}>
                  {label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Step({ index, children }: { index: number; children: ReactNode }) {
  const { state: { currentStep } } = useWizardContext()
  if (currentStep !== index) return null
  return <>{children}</>
}

function Navigation({
  canAdvance = true,
  isSubmitting = false,
  submitLabel = 'Submit',
  onCancel,
  onSubmit,
}: {
  canAdvance?: boolean
  isSubmitting?: boolean
  submitLabel?: string
  onCancel: () => void
  onSubmit: () => void
}) {
  const { state: { currentStep, totalSteps }, actions: { goNext, goBack } } = useWizardContext()
  const isLast = currentStep === totalSteps - 1

  return (
    <div className="flex flex-col-reverse gap-3 border-t border-border-secondary pt-5 sm:flex-row sm:items-center sm:justify-between">
      <Button onClick={onCancel} size="sm" variant="ghost">Cancel</Button>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {currentStep > 0 && <Button onClick={goBack} size="sm" variant="secondary">Back</Button>}
        {isLast ? (
          <Button onClick={onSubmit} size="sm" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting…' : submitLabel}
          </Button>
        ) : (
          <Button onClick={goNext} size="sm" variant="primary" disabled={!canAdvance}>Continue</Button>
        )}
      </div>
    </div>
  )
}

export const FormWizard = { Root, StepIndicator, Step, Navigation }
