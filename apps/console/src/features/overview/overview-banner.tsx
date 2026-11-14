import { Card } from '@moc/ui/components/display/card'
import { Paragraph } from '@moc/ui/components/display/text'
import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import { RetryNotification } from '@moc/ui/components/feedback/retry-notification'
import landscape from './daily-quote-landscape.webp'
import { useOverviewContext } from './overview-context'

export function OverviewBanner() {
  const { state, actions } = useOverviewContext()
  return (
    <Card role="region" aria-label="Daily quote" className="rounded-[1.75rem] border-0 bg-[#e7ede1] p-2 shadow-none [[data-theme=dark]_&]:bg-[#292f27] portrait:rounded-[1.375rem] portrait:p-1.5">
      <div className="relative isolate flex min-h-64 items-center overflow-hidden rounded-[1.25rem] bg-[#c6d3bc] p-4 tablet:p-3 landscape:items-end landscape:pt-28 portrait:rounded-2xl portrait:p-2 portrait:pt-24">
        <img src={landscape} alt="" className="pointer-events-none absolute inset-0 -z-20 size-full object-cover object-[76%_center] landscape:object-[84%_center]" />
        {state.quoteImageUrl ? <img key={state.quoteImageUrl} src={state.quoteImageUrl} alt="" onError={actions.hideQuoteImage} className="pointer-events-none absolute inset-0 -z-10 size-full object-cover" /> : null}
        <Card.Content className="w-[54%] min-w-0 max-w-[42rem] rounded-[1rem] border-0 bg-primary px-7 py-6 tablet:w-[60%] tablet:px-5 landscape:w-full landscape:max-w-none portrait:px-4 portrait:py-4">
          {state.quoteLoading ? <LoadingSpinner className="py-5" size="sm" /> : state.quoteError ? (
            <RetryNotification title="Daily quote couldn't load" description={state.quoteError.message} onRetry={actions.retryQuote} />
          ) : state.quoteText ? (
            <figure>
              <blockquote className="whitespace-pre-wrap font-[Georgia,serif] text-[1.1875rem]/[1.45] text-primary [overflow-wrap:anywhere] landscape:text-[1.0625rem]/[1.5]">{state.quoteText}</blockquote>
              {state.attribution ? <figcaption className="label-sm mt-4 border-l-2 border-[#92a184] pl-3 text-secondary [overflow-wrap:anywhere]">{state.attribution}</figcaption> : null}
            </figure>
          ) : <Paragraph.md className="text-secondary">Your day, at a glance.</Paragraph.md>}
        </Card.Content>
      </div>
    </Card>
  )
}
