import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import type { DailyQuote, DailyQuoteSelection } from '@moc/sdk/daily-quotes'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import { getErrorMessage } from '@moc/utils/get-error-message'
import { getCurrentWorkspaceGeneration } from '@/data/current-workspace'
import { useWorkspaceResource } from '@/hooks/use-workspace-resource'
import { useWorkspace } from '@/lib/workspace-context'
import { changeDailyQuoteActive, fetchDailyQuote, fetchDailyQuotes, saveDailyQuote, setTodayDailyQuote } from './daily-quote-service'

type QuoteEditor = { scope: string; open: boolean; id: string | null; text: string; attribution: string; active: boolean }
const emptyQuotes: DailyQuote[] = []
const textLimit = 1000
const attributionLimit = 200

function emptyEditor(scope: string): QuoteEditor {
  return { scope, open: false, id: null, text: '', attribution: '', active: true }
}

export function useDailyQuotes() {
  const { role, currentWorkspaceId } = useWorkspace()
  const generation = getCurrentWorkspaceGeneration()
  const scope = `${currentWorkspaceId ?? 'none'}:${generation}`
  const currentScope = useRef(scope)
  currentScope.current = scope
  const canManage = role?.can_manage_roles === true
  const resource = useWorkspaceResource({ emptyValue: emptyQuotes, fetcher: fetchDailyQuotes, resource: 'daily-quotes', workspaceId: currentWorkspaceId, enabled: canManage })
  const selection = useWorkspaceResource<DailyQuoteSelection | null>({ emptyValue: null, fetcher: fetchDailyQuote, resource: 'daily-quote', workspaceId: currentWorkspaceId, enabled: canManage })
  const { toast } = useFeedback()
  const [searchState, setSearchState] = useState({ scope, value: '' })
  const [editorState, setEditorState] = useState<QuoteEditor>(() => emptyEditor(scope))
  const [pendingScope, setPendingScope] = useState<string | null>(null)
  const busy = useRef<string | null>(null)
  const search = searchState.scope === scope ? searchState.value : ''
  const editor = editorState.scope === scope ? editorState : emptyEditor(scope)
  const isSaving = pendingScope === scope
  const visibleQuotes = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return resource.data.filter(quote => `${quote.text} ${quote.attribution ?? ''}`.toLocaleLowerCase().includes(query))
  }, [resource.data, search])
  const canSave = canManage && editor.open && !isSaving && editor.text.trim().length > 0 && editor.text.trim().length <= textLimit && editor.attribution.trim().length <= attributionLimit

  function changeSearch(event: ChangeEvent<HTMLInputElement>): void {
    setSearchState({ scope, value: event.currentTarget.value })
  }

  function openCreate(): void {
    if (canManage && !isSaving) setEditorState({ ...emptyEditor(scope), open: true })
  }

  function openEdit(quote: DailyQuote): void {
    if (!canManage || isSaving) return
    setEditorState({ scope, open: true, id: quote.id, text: quote.text, attribution: quote.attribution ?? '', active: quote.active })
  }

  function changeEditorOpen(open: boolean): void {
    if (isSaving) return
    if (open) openCreate()
    else setEditorState(emptyEditor(scope))
  }

  function closeEditor(): void { changeEditorOpen(false) }
  function changeText(event: ChangeEvent<HTMLTextAreaElement>): void { setEditorState({ ...editor, text: event.currentTarget.value }) }
  function changeAttribution(event: ChangeEvent<HTMLInputElement>): void { setEditorState({ ...editor, attribution: event.currentTarget.value }) }
  function editQuoteFor(quote: DailyQuote): () => void { return () => openEdit(quote) }
  function changeActiveFor(quote: DailyQuote): (active: boolean) => Promise<void> { return active => changeActive(quote, active) }
  function selectTodayFor(quote: DailyQuote): () => Promise<void> { return () => selectToday(quote) }
  function retry(): Promise<void> { return canManage ? resource.load(true) : Promise.resolve() }
  function retrySelection(): Promise<void> { return canManage ? selection.load(true) : Promise.resolve() }

  function canUseToday(quote: DailyQuote): boolean {
    return canManage && quote.active && !isSaving && selection.hasData && selection.data?.quote?.id !== quote.id
  }

  function isCurrent(): boolean {
    return currentScope.current === scope && generation === getCurrentWorkspaceGeneration()
  }

  function replaceQuote(updated: DailyQuote): void {
    resource.updateData(quotes => quotes.some(quote => quote.id === updated.id)
      ? quotes.map(quote => quote.id === updated.id ? updated : quote)
      : [updated, ...quotes])
  }

  async function runMutation<T>(request: (workspaceId: string) => Promise<T>, applyResult: (value: T) => void, successTitle: string): Promise<T | undefined> {
    if (!canManage || !currentWorkspaceId || busy.current === scope) return
    busy.current = scope
    setPendingScope(scope)
    try {
      const saved = await request(currentWorkspaceId)
      if (!isCurrent()) return
      applyResult(saved)
      toast({ title: successTitle, variant: 'success' })
      return saved
    } catch (error) {
      if (isCurrent()) toast({ title: 'Could not save quote', description: getErrorMessage(error, 'Please try again.'), variant: 'error' })
    } finally {
      if (busy.current === scope) busy.current = null
      if (isCurrent()) setPendingScope(null)
    }
  }

  function requestSave(workspaceId: string): Promise<DailyQuote> {
    return saveDailyQuote({ ...(editor.id ? { id: editor.id } : {}), text: editor.text.trim(), attribution: editor.attribution.trim() || null, active: editor.active }, workspaceId)
  }

  async function save(): Promise<void> {
    if (!canSave) return
    const saved = await runMutation(requestSave, replaceQuote, editor.id ? 'Quote updated' : 'Quote added')
    if (saved && isCurrent()) setEditorState(emptyEditor(scope))
  }

  async function changeActive(quote: DailyQuote, active: boolean): Promise<void> {
    if (!canManage || !currentWorkspaceId || isSaving || busy.current === scope || quote.active === active) return
    function requestChange(workspaceId: string): Promise<DailyQuote> { return changeDailyQuoteActive(quote.id, active, workspaceId) }
    await runMutation(requestChange, replaceQuote, active ? 'Quote activated' : 'Quote deactivated')
  }

  async function selectToday(quote: DailyQuote): Promise<void> {
    if (!canUseToday(quote)) return
    function requestSelection(workspaceId: string): Promise<DailyQuoteSelection> { return setTodayDailyQuote(quote.id, workspaceId) }
    await runMutation(requestSelection, selection.setData, 'Quote selected for today')
  }

  async function restoreAutomaticRotation(): Promise<void> {
    if (!selection.data?.overridden || isSaving) return
    function requestAutomatic(workspaceId: string): Promise<DailyQuoteSelection> { return setTodayDailyQuote(null, workspaceId) }
    await runMutation(requestAutomatic, selection.setData, 'Daily rotation resumed')
  }

  return {
    state: { search, editorOpen: editor.open, editingId: editor.id, text: editor.text, attribution: editor.attribution, isSaving, visibleQuotes, todayQuoteId: selection.data?.quote?.id ?? null, isOverridden: selection.data?.overridden === true },
    actions: { changeSearch, openCreate, editQuoteFor, changeEditorOpen, closeEditor, changeText, changeAttribution, changeActiveFor, selectTodayFor, restoreAutomaticRotation, save, retry, retrySelection },
    meta: { canManage, canSave, canUseToday, textLimit, attributionLimit, isInitialLoading: resource.isInitialLoading, error: resource.error, refreshError: resource.refreshError, selectionError: selection.error ?? selection.refreshError },
  }
}
