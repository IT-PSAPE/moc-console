import type { ReactNode } from "react";
import { Label, Paragraph } from "@moc/ui/components/display/text";

export function PublicDocumentFaq({ question, children }: { question: string; children: ReactNode }) {
  return (
    <section className="mb-5">
      <Label.md className="mb-1.5 block">{question}</Label.md>
      <Paragraph.md className="text-tertiary">{children}</Paragraph.md>
    </section>
  )
}
