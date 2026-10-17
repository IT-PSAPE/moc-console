import type { ReactNode } from "react";
import { Label } from "@moc/ui/components/display/text";

export function PublicDocumentStep({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <div className="mb-5 flex gap-4">
      <Label.xs className="flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">{number}</Label.xs>
      <div className="flex-1">
        <Label.md className="mb-1 block">{title}</Label.md>
        {children}
      </div>
    </div>
  )
}
