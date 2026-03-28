import { BarChart3 } from 'lucide-react'

export function RequestsInsights() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border-secondary bg-background-secondary px-6 py-16 text-center">
      <div className="mb-4 rounded-xl bg-utility-blue-50 p-4">
        <BarChart3 className="h-8 w-8 text-utility-blue-600" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary">Insights</h3>
      <p className="mt-2 max-w-sm text-sm text-text-tertiary">
        Reporting and analytics for your request pipeline are coming soon. You'll be able to track turnaround times, request volume, and team workload.
      </p>
      <span className="mt-4 inline-flex items-center rounded-full border border-border-secondary bg-background-primary px-3 py-1 text-xs font-medium text-text-tertiary">
        Coming Soon
      </span>
    </div>
  )
}
