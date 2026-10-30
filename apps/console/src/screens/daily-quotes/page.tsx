import { Pencil, Plus, Quote, RotateCcw, Search, Sun } from 'lucide-react'
import type { DailyQuote } from '@moc/sdk/daily-quotes'
import { Button } from '@moc/ui/components/controls/button'
import { Card } from '@moc/ui/components/display/card'
import { Table } from '@moc/ui/components/display/table'
import { Badge } from '@moc/ui/components/display/badge'
import { Label, Paragraph } from '@moc/ui/components/display/text'
import { EmptyState } from '@moc/ui/components/feedback/empty-state'
import { RetryNotification } from '@moc/ui/components/feedback/retry-notification'
import { FormField } from '@moc/ui/components/form/form-field'
import { Input } from '@moc/ui/components/form/input'
import { TextArea } from '@moc/ui/components/form/text-area'
import { Toggle } from '@moc/ui/components/form/toggle'
import { Page } from '@moc/ui/components/layout/page'
import { Modal } from '@moc/ui/components/overlays/modal'
import { ResourceLoadError } from '@/components/feedback/resource-load-error'
import { useDailyQuotes } from '@/features/daily-quotes/use-daily-quotes'

export function DailyQuotesScreen() {
  const { state, actions, meta } = useDailyQuotes()

  function renderQuote(quote: DailyQuote) {
    return <Table.Row key={quote.id}>
      <Table.Cell className="max-w-0 landscape:px-3">
        <Paragraph.sm className="line-clamp-3 whitespace-pre-wrap break-words text-primary" title={quote.text}>{quote.text}</Paragraph.sm>
        {quote.attribution ? <Label.xs className="mt-1 block truncate text-tertiary" title={quote.attribution}>{quote.attribution}</Label.xs> : null}
        {quote.id === state.todayQuoteId && quote.active ? <Badge color="green" label="Today" className="mt-2" /> : null}
      </Table.Cell>
      <Table.Cell className="landscape:px-2"><Toggle checked={quote.active} onChange={actions.changeActiveFor(quote)} disabled={!meta.canManage || state.isSaving} aria-label={`Quote active: ${quote.text}`}><span className="landscape:hidden">{quote.active ? 'Active' : 'Inactive'}</span></Toggle></Table.Cell>
      <Table.Cell className="text-right landscape:px-2"><div className="flex items-center justify-end gap-1">
        {quote.active ? <Button aria-label={`Use today: ${quote.text}`} icon={<Sun />} variant="ghost" size="sm" className="landscape:w-control-sm landscape:px-0" disabled={!meta.canUseToday(quote)} onClick={actions.selectTodayFor(quote)}><span className="landscape:hidden">Use today</span></Button> : null}
        <Button.Icon aria-label={`Edit quote: ${quote.text}`} icon={<Pencil />} variant="ghost" size="sm" disabled={!meta.canManage || state.isSaving} onClick={actions.editQuoteFor(quote)} />
      </div></Table.Cell>
    </Table.Row>
  }

  if (meta.isInitialLoading) return <Page.Loading />

  return <Page>
    <Page.Header>
      <Page.Heading><Page.Title>Daily quotes</Page.Title></Page.Heading>
      <Page.Controls>
        <Input aria-label="Search daily quotes" name="daily-quote-search" autoComplete="off" icon={<Search />} placeholder="Search quotes…" value={state.search} onChange={actions.changeSearch} />
        {meta.canManage && state.isOverridden ? <Button icon={<RotateCcw />} variant="secondary" onClick={actions.restoreAutomaticRotation} disabled={state.isSaving}>Use automatic rotation</Button> : null}
        {meta.canManage ? <Button icon={<Plus />} variant="secondary" onClick={actions.openCreate}>Add quote</Button> : null}
      </Page.Controls>
    </Page.Header>
    <Page.Content>
      {meta.refreshError ? <RetryNotification title="Quotes could not be refreshed" description={meta.refreshError.message} onRetry={actions.retry} /> : null}
      {meta.selectionError ? <RetryNotification title="Today's quote could not be loaded" description={meta.selectionError.message} onRetry={actions.retrySelection} /> : null}
      {meta.error ? <ResourceLoadError title="Couldn't load daily quotes" error={meta.error} onRetry={actions.retry} /> : state.visibleQuotes.length ? <Card><Table className="w-full table-fixed">
        <Table.Head><Table.Row><Table.Header className="landscape:px-3">Quote</Table.Header><Table.Header className="w-36 landscape:w-20 landscape:px-2">Status</Table.Header><Table.Header className="w-44 text-right landscape:w-20 landscape:px-2">Actions</Table.Header></Table.Row></Table.Head>
        <Table.Body>{state.visibleQuotes.map(renderQuote)}</Table.Body>
      </Table></Card> : <EmptyState icon={<Quote />} title={state.search ? 'No quotes match your search' : 'No daily quotes yet'} description={state.search ? 'Try another quote or attribution.' : 'Add a quote to share on Overview.'} />}
    </Page.Content>
    {meta.canManage ? <Modal open={state.editorOpen} onOpenChange={actions.changeEditorOpen} closeOnEscape={!state.isSaving} closeOnBackdropClick={!state.isSaving}>
      <Modal.Portal><Modal.Backdrop /><Modal.Positioner><Modal.Panel>
        <Modal.Header><Label.md>{state.editingId ? 'Edit quote' : 'Add quote'}</Label.md></Modal.Header>
        <Modal.Content className="flex flex-col gap-4">
          <FormField label="Quote" htmlFor="daily-quote-text" required>
            <TextArea id="daily-quote-text" name="daily-quote-text" aria-label="Quote" value={state.text} onChange={actions.changeText} rows={4} maxLength={meta.textLimit} disabled={state.isSaving} placeholder="Write a quote…" autoFocus />
          </FormField>
          <FormField label="Attribution" htmlFor="daily-quote-attribution" optional>
            <Input id="daily-quote-attribution" name="daily-quote-attribution" aria-label="Attribution" autoComplete="off" value={state.attribution} onChange={actions.changeAttribution} maxLength={meta.attributionLimit} disabled={state.isSaving} placeholder="Name or source" />
          </FormField>
        </Modal.Content>
        <Modal.Footer><Button variant="secondary" onClick={actions.closeEditor} disabled={state.isSaving}>Cancel</Button><Button onClick={actions.save} disabled={!meta.canSave}>{state.isSaving ? 'Saving…' : 'Save quote'}</Button></Modal.Footer>
      </Modal.Panel></Modal.Positioner></Modal.Portal>
    </Modal> : null}
  </Page>
}
