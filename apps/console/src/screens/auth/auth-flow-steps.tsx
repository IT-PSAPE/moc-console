import { cn } from "@moc/utils/cn"

export function AuthFlowSteps({ current, total }: { current: number; total: number }) {
  function renderStep(_: unknown, index: number) {
    return (
      <span
        key={index}
        className={cn(
          "h-1 flex-1 rounded-full transition-colors duration-500 motion-reduce:transition-none",
          index + 1 <= current ? "bg-brand_solid" : "bg-quaternary",
        )}
      />
    )
  }

  return (
    <div
      className="flex items-center gap-1.5 px-1"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-label={`Step ${current} of ${total}`}
    >
      {Array.from({ length: total }).map(renderStep)}
    </div>
  )
}
