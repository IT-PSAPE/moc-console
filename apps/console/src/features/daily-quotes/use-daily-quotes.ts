import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import type { DailyQuote, DailyQuoteSelection } from '@moc/sdk/daily-quotes'
import { useFeedback } from '@moc/ui/components/feedback/feedback-provider'
import type { FilePartition } from '@moc/utils/file-constraints'
import { getErrorMessage } from '@moc/utils/get-error-message'
import { getCurrentWorkspaceGeneration } from '@/data/current-workspace'
import { useTaskLifetime } from '@/hooks/use-task-lifetime'
import { useWorkspaceResource } from '@/hooks/use-workspace-resource'
import { useWorkspace } from '@/lib/workspace-context'
import { changeDailyQuoteActive, fetchDailyQuote, fetchDailyQuotes, saveDailyQuote, setTodayDailyQuote, uploadDailyQuoteImage } from './daily-quote-service'

type QuoteImageSelection = { file: File; status: 'checking' | 'ready' | 'invalid'; uploadedPath?: string }
type QuoteEditor = {
  scope: string
  open: boolean
  id: string | null
  text: string
  attribution: string
  active: boolean
  imageUrl: string | null
  failedImageUrl?: string
  imageRemoved: boolean
  imageSelection: QuoteImageSelection | null
  imageError: string | null
  saveError?: string
}
const emptyQuotes: DailyQuote[] = []
const textLimit = 1000
const attributionLimit = 200

function emptyEditor(scope: string): QuoteEditor {
  return { scope, open: false, id: null, text: '', attribution: '', active: true, imageUrl: null, imageRemoved: false, imageSelection: null, imageError: null }
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
  const tasks = useTaskLifetime(scope)
  const [searchState, setSearchState] = useState({ scope, value: '' })
  const [editorState, setEditorState] = useState<QuoteEditor>(() => emptyEditor(scope))
  const [localPreview, setLocalPreview] = useState<{ file: File; url: string } | null>(null)
  const [pendingScope, setPendingScope] = useState<string | null>(null)
  const [uploadingScope, setUploadingScope] = useState<string | null>(null)
  const uploadTask = useRef<AbortController | null>(null)
  const busy = useRef<string | null>(null)
  const search = searchState.scope === scope ? searchState.value : ''
  const editor = editorState.scope === scope ? editorState : emptyEditor(scope)
  const imageFile = editor.imageSelection?.file ?? null
  const savedImage = editor.imageRemoved || editor.failedImageUrl === editor.imageUrl ? null : editor.imageUrl
  const imagePreview = imageFile ? (localPreview?.file === imageFile ? localPreview.url : null) : savedImage
  useEffect(() => {
    if (!imageFile) {
      setLocalPreview(null)
      return
    }
    const url = URL.createObjectURL(imageFile)
    setLocalPreview({ file: imageFile, url })
    return () => URL.revokeObjectURL(url)
  }, [imageFile])
  const isSaving = pendingScope === scope
  const isUploading = uploadingScope === scope
  const visibleQuotes = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return resource.data.filter(quote => `${quote.text} ${quote.attribution ?? ''}`.toLocaleLowerCase().includes(query))
  }, [resource.data, search])
  const canSave = canManage && editor.open && !isSaving && editor.text.trim().length > 0 && editor.text.trim().length <= textLimit && editor.attribution.trim().length <= attributionLimit && (!editor.imageSelection || editor.imageSelection.status === 'ready')

  function changeSearch(event: ChangeEvent<HTMLInputElement>): void {
    setSearchState({ scope, value: event.currentTarget.value })
  }

  function openCreate(): void {
    if (canManage && !isSaving) setEditorState({ ...emptyEditor(scope), open: true })
  }

  function openEdit(quote: DailyQuote): void {
    if (!canManage || isSaving) return
    setEditorState({ ...emptyEditor(scope), open: true, id: quote.id, text: quote.text, attribution: quote.attribution ?? '', active: quote.active, imageUrl: quote.imageUrl ?? null })
  }

  function changeEditorOpen(open: boolean): void {
    if (isSaving) return
    if (open) openCreate()
    else setEditorState(emptyEditor(scope))
  }

  function closeEditor(): void { changeEditorOpen(false) }
  function cancelUpload(): void { uploadTask.current?.abort() }
  function changeText(event: ChangeEvent<HTMLTextAreaElement>): void { setEditorState({ ...editor, text: event.currentTarget.value }) }
  function changeAttribution(event: ChangeEvent<HTMLInputElement>): void { setEditorState({ ...editor, attribution: event.currentTarget.value }) }
  function changeImage({ acceptedFiles, rejections }: FilePartition): void {
    const file = acceptedFiles[0]
    const imageError = file ? null : rejections[0]?.reason ?? null
    setEditorState({ ...editor, imageError, imageSelection: file ? { file, status: 'checking' } : editor.imageSelection })
  }
  function removeImage(): void {
    setEditorState({ ...editor, imageRemoved: editor.imageSelection ? editor.imageRemoved : Boolean(editor.imageUrl), imageSelection: null, imageError: null })
  }
  function setImageDecodeStatus(status: 'ready' | 'invalid'): void {
    setEditorState(current => {
      if (!current.open || current.scope !== scope || current.imageSelection?.file !== imageFile || !current.imageSelection) return current
      return { ...current, imageSelection: { ...current.imageSelection, status }, imageError: status === 'invalid' ? 'The image could not be opened. Choose another file.' : null }
    })
  }
  function imageLoaded(): void { setImageDecodeStatus('ready') }
  function imageFailed(): void {
    if (imageFile) setImageDecodeStatus('invalid')
    else setEditorState(current => current.scope === scope && current.open && !current.imageSelection && current.imageUrl === imagePreview
      ? { ...current, failedImageUrl: current.imageUrl ?? undefined, imageError: 'The saved image could not be loaded. You can replace or remove it.' }
      : current)
  }
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

  function showMutationError(message: string): void {
    toast({ title: 'Could not save quote', description: message, variant: 'error' })
  }

  function showSaveError(message: string): void {
    setEditorState(current => ({ ...current, saveError: message }))
  }

  async function runMutation<T>(request: (workspaceId: string) => Promise<T>, applyResult: (value: T) => void, successTitle: string, showError = showMutationError): Promise<T | undefined> {
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
      if (isCurrent() && !(error instanceof DOMException && error.name === 'AbortError')) {
        showError(getErrorMessage(error, 'Please try again.'))
      }
    } finally {
      if (busy.current === scope) busy.current = null
      if (isCurrent()) setPendingScope(null)
    }
  }

  async function requestSave(workspaceId: string): Promise<DailyQuote> {
    setEditorState(current => ({ ...current, saveError: undefined }))
    const { imageSelection } = editor
    let imagePath: string | null | undefined = editor.imageRemoved ? null : undefined
    if (imageSelection?.uploadedPath) imagePath = imageSelection.uploadedPath
    else if (imageSelection) {
      const task = tasks.start()
      uploadTask.current = task
      setUploadingScope(scope)
      try {
        const uploadedPath = await uploadDailyQuoteImage(imageSelection.file, workspaceId, task.signal)
        task.signal.throwIfAborted()
        if (!isCurrent()) throw new Error('Workspace changed during upload')
        imagePath = uploadedPath
        // Keep the upload if the quote write fails so a retry can reuse it.
        setEditorState(current => ({ ...current, imageSelection: { ...imageSelection, uploadedPath } }))
      } finally {
        tasks.finish(task)
        if (uploadTask.current === task) uploadTask.current = null
        setUploadingScope(current => current === scope ? null : current)
      }
    }
    return saveDailyQuote({ ...(editor.id ? { id: editor.id } : {}), text: editor.text.trim(), attribution: editor.attribution.trim() || null, active: editor.active, imagePath }, workspaceId)
  }

  async function save(): Promise<void> {
    if (!canSave) return
    const saved = await runMutation(requestSave, replaceQuote, editor.id ? 'Quote updated' : 'Quote added', showSaveError)
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
    state: { search, editorOpen: editor.open, editingId: editor.id, text: editor.text, attribution: editor.attribution, imagePreview, imageName: imageFile?.name, imageError: editor.imageError, imageInvalid: editor.imageSelection?.status === 'invalid', hasImage: Boolean(imageFile || (editor.imageUrl && !editor.imageRemoved)), replacingImage: Boolean(imageFile && editor.imageUrl && !editor.imageRemoved), isSaving, isUploading, saveError: editor.saveError, visibleQuotes, todayQuoteId: selection.data?.quote?.id ?? null, isOverridden: selection.data?.overridden === true },
    actions: { changeSearch, openCreate, editQuoteFor, changeEditorOpen, closeEditor, cancelUpload, changeText, changeAttribution, changeImage, removeImage, imageLoaded, imageFailed, changeActiveFor, selectTodayFor, restoreAutomaticRotation, save, retry, retrySelection },
    meta: { canManage, canSave, canUseToday, textLimit, attributionLimit, isInitialLoading: resource.isInitialLoading, error: resource.error, refreshError: resource.refreshError, selectionError: selection.error ?? selection.refreshError },
  }
}
