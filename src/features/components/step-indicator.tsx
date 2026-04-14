import { cn } from '@/utils/cn'
import { Label } from '@/components/display/text'
import { Check } from 'lucide-react'

export function StepIndicator({ currentStep, totalSteps, labels }: { currentStep: number; totalSteps: number; labels?: string[] }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1
        const isActive = step === currentStep
        const isCompleted = step < currentStep

        return (
          <div key={step} className="flex items-center gap-2">
            {i > 0 && (
              <div className={cn('h-px w-4 sm:w-8', isCompleted ? 'bg-brand' : 'bg-tertiary/30')} />
            )}
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'flex size-7 items-center justify-center rounded-full text-xs font-semibold shrink-0 transition-colors',
                  isActive && 'bg-brand text-white',
                  isCompleted && 'bg-brand/10 text-brand',
                  !isActive && !isCompleted && 'bg-disabled text-tertiary'
                )}
              >
                {isCompleted ? <Check className="size-3.5" /> : step}
              </span>
              {labels?.[i] && (
                <Label.xs className={cn('hidden sm:block', isActive ? 'text-primary' : 'text-tertiary')}>
                  {labels[i]}
                </Label.xs>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
