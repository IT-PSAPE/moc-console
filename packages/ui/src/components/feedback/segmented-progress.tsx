import { cn } from '@moc/utils/cn'
import type { HTMLAttributes } from 'react'

type SegmentedProgressProps = Omit<HTMLAttributes<HTMLDivElement>, 'role'> & {
  max: number
  value: number
}

export function SegmentedProgress({ className, max, value, ...props }: SegmentedProgressProps) {
  const segmentCount = Math.max(1, Math.trunc(max))
  const reachedCount = Math.min(Math.max(Math.trunc(value), 1), segmentCount)
  const segments = Array.from({ length: segmentCount }, (_, index) => index)

  function renderSegment(index: number) {
    const isReached = index < reachedCount
    return <span key={index} aria-hidden="true" className={cn('h-1 flex-1 rounded-full transition-colors', isReached ? 'bg-brand_solid' : 'bg-quaternary')} />
  }

  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={segmentCount}
      aria-valuenow={reachedCount}
      className={cn('flex w-full gap-2', className)}
      {...props}
    >
      {segments.map(renderSegment)}
    </div>
  )
}
