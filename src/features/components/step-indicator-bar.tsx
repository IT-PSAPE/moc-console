import { Label } from '@/components/display/text'
import { cn } from '@/utils/cn'

type StepIndicatorBarProps = {
  currentStep: number
  totalSteps: number
  labels: string[]
}

export function StepIndicatorBar({ currentStep, totalSteps, labels }: StepIndicatorBarProps) {
  const clampedStep = Math.min(Math.max(currentStep, 1), totalSteps)
  const progressPercent = totalSteps > 1 ? ((clampedStep - 1) / (totalSteps - 1)) * 100 : 0
  const barWidthPercent = totalSteps > 1 ? ((totalSteps - 1) / totalSteps) * 100 : 0

  return (
    <div className="w-full">
      <div
        className="relative h-1 mx-auto"
        style={{ width: `${barWidthPercent}%` }}
      >
        <div className="absolute inset-0 rounded-full bg-disabled" />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-brand_solid transition-[width] duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
        <div
          className={cn(
            'absolute top-1/2 size-2.5 rounded-full bg-brand_solid',
            'outline outline-4 outline-white',
            '-translate-x-1/2 -translate-y-1/2',
            'transition-[left] duration-500 ease-out',
          )}
          style={{ left: `${progressPercent}%` }}
        />
      </div>

      <div
        className="grid mt-4"
        style={{ gridTemplateColumns: `repeat(${totalSteps}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1
          const isActive = step === clampedStep
          return (
            <div key={step} className="text-center">
              <Label.sm className={cn(isActive ? 'text-primary font-semibold' : 'text-tertiary')}>
                {labels[i] ?? `Step ${step}`}
              </Label.sm>
            </div>
          )
        })}
      </div>
    </div>
  )
}
