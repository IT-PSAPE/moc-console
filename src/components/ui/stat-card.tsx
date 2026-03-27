import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: { value: string; positive: boolean }
  accent?: string
}

const ACCENT_STYLES: Record<string, string> = {
  blue: 'bg-utility-blue-50 text-utility-blue-600',
  emerald: 'bg-utility-success-50 text-utility-success-600',
  amber: 'bg-utility-warning-50 text-utility-warning-600',
  red: 'bg-utility-error-50 text-utility-error-600',
  purple: 'bg-purple-50 text-purple-600',
}

export function StatCard({ label, value, icon: Icon, trend, accent = 'blue' }: StatCardProps) {
  const iconStyle = ACCENT_STYLES[accent] ?? ACCENT_STYLES.blue

  return (
    <div className="rounded-xl border border-border-secondary bg-background-primary p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-tertiary">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-text-primary">{value}</p>
          {trend && (
            <p className={`mt-1 text-xs ${trend.positive ? 'text-foreground-success_primary' : 'text-foreground-error_primary'}`}>
              {trend.positive ? '+' : ''}{trend.value}
            </p>
          )}
        </div>
        <div className={`rounded-lg p-2.5 ${iconStyle}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}
