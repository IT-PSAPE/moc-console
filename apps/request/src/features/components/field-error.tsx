import { Paragraph } from '@moc/ui/components/display/text'

type FieldErrorProps = {
  id: string
  message?: string
}

export function FieldError({ id, message }: FieldErrorProps) {
  if (!message) return null

  return <Paragraph.xs id={id} role="alert" aria-live="polite" className="text-error">{message}</Paragraph.xs>
}
