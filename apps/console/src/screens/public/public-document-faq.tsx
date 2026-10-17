import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { Accordion } from "@moc/ui/components/display/accordion";
import { Paragraph } from "@moc/ui/components/display/text";

export function PublicDocumentFaq({ value, question, children }: { value: string; question: string; children: ReactNode }) {
  return (
    <Accordion.Item value={value} className="border-b border-secondary last:border-b-0">
      <Accordion.Trigger className="flex w-full items-center justify-between gap-3 px-4 py-3">
        {question}
        <ChevronDown className="size-4 shrink-0 text-tertiary transition-transform group-data-[panel-open]:rotate-180" />
      </Accordion.Trigger>
      <Accordion.Content>
        <Paragraph.sm className="px-4 pb-3 text-tertiary">{children}</Paragraph.sm>
      </Accordion.Content>
    </Accordion.Item>
  )
}
