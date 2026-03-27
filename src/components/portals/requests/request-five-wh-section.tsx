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
    <section className="space-y-3">
      <h4 className="text-sm font-semibold text-text-primary">5Ws and 1H</h4>
      <div className="space-y-2">
        {fields.map(({ label, value }) => (
          <p key={label} className="text-sm text-text-primary">
            <span className="font-semibold">{label}:</span>{' '}
            {value || 'Not specified'}
          </p>
        ))}
      </div>
    </section>
  )
}
