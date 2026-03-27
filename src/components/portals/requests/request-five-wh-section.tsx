import { InfoList } from '@/components/ui/info-list'
import type { CultureRequest } from '@/types'

interface RequestFiveWhSectionProps {
  request: CultureRequest
}

export function RequestFiveWhSection({ request }: RequestFiveWhSectionProps) {
  const fields = [
    { label: 'Who', value: request.who },
    { label: 'What', value: request.what },
    { label: 'When', value: request.when },
    { label: 'Where', value: request.where },
    { label: 'Why', value: request.why },
    { label: 'How', value: request.how },
  ]

  return (
    <InfoList.Root>
        {fields.map(({ label, value }) => (
          <InfoList.Item key={label}>
            <InfoList.Label>{label}</InfoList.Label>
            <InfoList.Value>{value || 'Not specified'}</InfoList.Value>
          </InfoList.Item>
        ))}
    </InfoList.Root>
  )
}
