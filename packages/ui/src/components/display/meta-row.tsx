import { Label } from "./text"

export function MetaRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 [&_[data-ui-control]]:min-h-9">
      <div className="flex min-h-6 w-40 shrink-0 flex-1 items-center gap-2 text-tertiary">
        <span className="*:size-4">{icon}</span>
        <Label.xs className="text-tertiary truncate w-full">{label}</Label.xs>
      </div>
      <div className="flex min-h-6 min-w-0 flex-[2] items-center break-words">{children}</div>
    </div>
  )
}
