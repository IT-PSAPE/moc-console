import { Info } from "lucide-react"
import { MetaRow } from "@moc/ui/components/display/meta-row"
import { Divider } from "@moc/ui/components/display/divider"
import type { MiniAppField } from "@moc/notifications"

type EntityFieldsListProps = {
  fields: MiniAppField[]
}

export function EntityFieldsList({ fields }: EntityFieldsListProps) {
  if (fields.length === 0) {
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
    </section>
  )
}
