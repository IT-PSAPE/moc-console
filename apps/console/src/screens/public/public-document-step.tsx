import type { ReactNode } from "react";
import { Label } from "@moc/ui/components/display/text";

export function PublicDocumentStep({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <div className="mb-5 flex gap-4">
      <span className="label-sm flex size-7 shrink-0 items-center justify-center rounded-full bg-brand_secondary text-brand">{number}</span>
      <div className="flex-1">
        <Label.md className="mb-1 block">{title}</Label.md>
        {children}
      </div>
    </div>
  )
}
