import { Card } from '@moc/ui/components/display/card'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { ShaderSurface } from '@moc/ui/components/display/shader-surface'
import { LoadingSpinner } from '@moc/ui/components/feedback/spinner'
import { RetryNotification } from '@moc/ui/components/feedback/retry-notification'
import { cn } from '@moc/utils/cn'
import { useOverviewContext } from './overview-context'
import { overviewQuoteColorTokens, overviewQuoteShader } from './overview-quote-shader'

export function OverviewBanner() {
  const { state, actions } = useOverviewContext()
  return <Card role="region" aria-label="Daily quote" className={cn(
    'relative isolate border-brand/40 bg-brand_solid p-7 text-paragraph-md text-(--color-background-overlay) shadow-none portrait:p-5',
    'before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:bg-linear-to-r before:from-(--color-text-on-brand)/45 before:via-(--color-text-on-brand)/30 before:via-70% before:to-transparent tablet:before:to-(--color-text-on-brand)/30',
  )}>
    <ShaderSurface fragmentShader={overviewQuoteShader} colorTokens={overviewQuoteColorTokens} className="-z-20" />
    {state.quoteLoading ? <LoadingSpinner className="py-5 [&_[role=status]]:text-inherit" size="sm" /> : state.quoteText ? <Card.Content className="flex max-w-[54ch] flex-col gap-3 border-0!">
      <Paragraph.md className="text-inherit">{state.quoteText}</Paragraph.md>
      {state.attribution ? <Label.sm className="text-inherit">{state.attribution}</Label.sm> : null}
    </Card.Content> : <Paragraph.md className="text-inherit">Your day, at a glance.</Paragraph.md>}
    {state.quoteError ? <RetryNotification title="Daily quote couldn't load" description={state.quoteError.message} onRetry={actions.retryQuote} /> : null}
  </Card>
}
