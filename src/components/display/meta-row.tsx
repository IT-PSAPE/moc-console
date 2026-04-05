import { Label } from "./text"

export function MetaRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="min-h-6 flex-1 flex items-center gap-2 w-40 shrink-0 text-tertiary">
        <span className="*:size-4">{icon}</span>
        <Label.xs className="text-tertiary truncate w-full">{label}</Label.xs>
      </div>
      <div className="min-h-6 flex-2 flex items-center flex-1">{children}</div>
    </div>
  )
}
