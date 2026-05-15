import { cn } from '@/utils/cn'
import { cv } from '@/utils/cv'
import { Label } from '@/components/display/text'
import { Check } from 'lucide-react'

type StepState = 'active' | 'completed' | 'upcoming'

const stepCircle = cv({
  base: ['flex size-7 items-center justify-center rounded-full text-xs font-semibold shrink-0 transition-colors'],
  variants: {
    state: {
      active: ['bg-brand_primary text-brand_teriary'],
      completed: ['bg-brand_solid text-white'],
      upcoming: ['bg-disabled text-tertiary'],
    },
  },
  defaultVariants: { state: 'upcoming' },
})

const stepLabel = cv({
  base: ['hidden sm:block'],
  variants: {
    state: {
      active: ['text-primary'],
      completed: ['text-tertiary'],
      upcoming: ['text-tertiary'],
    },
  },
  defaultVariants: { state: 'upcoming' },
})

export function StepIndicator({ currentStep, totalSteps, labels }: { currentStep: number; totalSteps: number; labels?: string[] }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1
        const state: StepState = step === currentStep ? 'active' : step < currentStep ? 'completed' : 'upcoming'
        return (
          <div key={step} className="flex items-center gap-2">
            {i > 0 && <div className={cn('h-px w-4 sm:w-8 bg-tertiary')} />}
            <StepIndicatorItem step={step} label={labels?.[i]} state={state} />
          </div>
        )
      })}
    </div>
  )
}

function StepIndicatorItem({ step, label, state }: { step: number; label?: string; state: StepState }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={stepCircle({ state })}>
        {state === 'completed' ? <Check className="size-3.5" /> : step}
      </span>
      {label && (
        <Label.xs className={stepLabel({ state })}>
          {label}
        </Label.xs>
      )}
    </div>
  )
}
