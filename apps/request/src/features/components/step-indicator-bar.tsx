import { SegmentedProgress } from '@moc/ui/components/feedback/segmented-progress'

type StepIndicatorBarProps = {
  currentStep: number
  totalSteps: number
}

export function StepIndicatorBar({ currentStep, totalSteps }: StepIndicatorBarProps) {
  return <SegmentedProgress aria-label="Submission progress" max={totalSteps} value={currentStep} />
}
