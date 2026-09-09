import { Range } from "@moc/ui/components/form/range"
import { cn } from "@moc/utils/cn"
import type { ChangeEvent } from "react"

type BroadcastSliderProps = {
  ariaLabel: string
  ariaValueText: string
  className?: string
  disabled?: boolean
  fillRatio: number
  max: number
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  step: number
  value: number
}

// WebKit has no equivalent of ::-moz-range-progress, so the filled portion is a
// layer of its own behind a range input whose own track is made transparent.
const transparentTrackClassName = [
  "relative bg-transparent",
  "[&::-webkit-slider-runnable-track]:bg-transparent",
  "[&::-moz-range-track]:bg-transparent",
  "[&::-moz-range-progress]:bg-transparent",
].join(" ")

export function BroadcastSlider({ ariaLabel, ariaValueText, className, disabled, fillRatio, max, onChange, step, value }: BroadcastSliderProps) {
  return (
    <div className={cn("relative flex min-w-0 flex-1 items-center", className)}>
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-quaternary">
        <div className="h-full rounded-full bg-brand_solid" style={{ width: `${Math.min(Math.max(fillRatio, 0), 1) * 100}%` }} />
      </div>
      <Range
        aria-label={ariaLabel}
        aria-valuetext={ariaValueText}
        className={transparentTrackClassName}
        disabled={disabled}
        max={max}
        min={0}
        onChange={onChange}
        step={step}
        value={value}
      />
    </div>
  )
}
