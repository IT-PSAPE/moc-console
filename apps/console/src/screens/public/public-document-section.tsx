import type { ReactNode } from "react";
import { Divider } from "@moc/ui/components/display/divider";
import { Label } from "@moc/ui/components/display/text";

export function PublicDocumentSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <Divider className="mb-6" />
      <Label.md className="mb-3 block">{title}</Label.md>
      {children}
    </section>
  )
}
