import { Info, StickyNote } from "lucide-react"
import { MetaRow } from "@moc/ui/components/display/meta-row"
import { Divider } from "@moc/ui/components/display/divider"
import { Paragraph } from "@moc/ui/components/display/text"
import type { MiniAppField } from "@moc/notifications"

type EntityFieldsListProps = {
  fields: MiniAppField[]
  notes: string | null
}

export function EntityFieldsList({ fields, notes }: EntityFieldsListProps) {
  if (fields.length === 0 && !notes) {
    return null
  }

  return (
    <section className="flex flex-col gap-3">
      {fields.map((field, index) => (
        <div key={field.label} className="flex flex-col gap-3">
          {index > 0 && <Divider />}
          <MetaRow icon={<Info />} label={field.label}>{field.value}</MetaRow>
        </div>
      ))}
      {notes && (
        <>
          {fields.length > 0 && <Divider />}
          <MetaRow icon={<StickyNote />} label="Notes">
            <Paragraph.sm className="whitespace-pre-wrap">{notes}</Paragraph.sm>
          </MetaRow>
        </>
      )}
    </section>
  )
}
