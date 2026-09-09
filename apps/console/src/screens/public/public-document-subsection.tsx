import type { ReactNode } from "react";
import { Label } from "@moc/ui/components/display/text";

export function PublicDocumentSubsection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <Label.md className="mb-2 block">{title}</Label.md>
      {children}
    </section>
  )
}
