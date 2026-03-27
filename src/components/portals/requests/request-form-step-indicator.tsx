import { REQUEST_STEPS } from './request-constants'

interface RequestFormStepIndicatorProps {
  currentStep: number
}

export function RequestFormStepIndicator({ currentStep }: RequestFormStepIndicatorProps) {
  return (
    <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1">
      {REQUEST_STEPS.map((label, index) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
              index < currentStep
                ? 'bg-background-brand_solid text-static-white'
                : index === currentStep
                  ? 'border-2 border-border-brand text-text-brand'
                  : 'border border-border-secondary text-text-quaternary'
            }`}
          >
            {index < currentStep ? '✓' : index + 1}
          </div>
          <span
            className={`whitespace-nowrap text-xs ${
              index === currentStep ? 'font-medium text-text-primary' : 'text-text-quaternary'
            }`}
          >
            {label}
          </span>
          {index < REQUEST_STEPS.length - 1 && <div className="h-px w-6 bg-border-secondary" />}
        </div>
      ))}
    </div>
  )
}
