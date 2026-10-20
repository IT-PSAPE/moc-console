import { useState, useCallback, useRef } from 'react'
import { deleteTrackedSubmission, lookupTrackingCode } from '@/data/tracking-submissions'
import type { TrackingResult } from '@/types/tracking'
import { canRequesterModify } from '@/features/tracking-submission'

export function useTrackingLookup() {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<TrackingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [searched, setSearched] = useState(false)
  const [editingVersion, setEditingVersion] = useState<number | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const requestVersion = useRef(0)

  const lookup = useCallback(async () => {
    const normalizedCode = code.trim().toUpperCase()
    if (!normalizedCode) return

    const currentRequest = ++requestVersion.current
    setLoading(true)
    setError(null)
    setNotFound(false)
    setResult(null)
    setEditingVersion(null)
    setDeleteOpen(false)
    setDeleting(false)
    setNotice(null)
    setSearched(true)

    try {
      const data = await lookupTrackingCode(normalizedCode)
      if (currentRequest !== requestVersion.current) return
      if (data) {
        setResult(data)
      } else {
        setNotFound(true)
      }
    } catch (err) {
      if (currentRequest !== requestVersion.current) return
      setError(err instanceof Error ? err.message : 'Failed to look up tracking code')
    } finally {
      if (currentRequest === requestVersion.current) setLoading(false)
    }
  }, [code])

  const updateCode = useCallback((nextCode: string) => {
    requestVersion.current += 1
    setCode(nextCode)
    setLoading(false)
    setError(null)
    setNotFound(false)
    setResult(null)
    setEditingVersion(null)
    setDeleteOpen(false)
    setDeleting(false)
    setNotice(null)
    setSearched(false)
  }, [])

  function beginEdit() {
    setEditingVersion(++requestVersion.current)
    setNotice(null)
  }

  function cancelEdit() {
    requestVersion.current += 1
    setEditingVersion(null)
  }

  function handleSaved(submission: TrackingResult) {
    if (editingVersion === null || editingVersion !== requestVersion.current) return
    requestVersion.current += 1
    setResult(submission)
    setEditingVersion(null)
    setNotice("Your changes have been saved.")
  }

  function openDelete() {
    setDeleteOpen(true)
  }

  function closeDelete() {
    setDeleteOpen(false)
  }

  const remove = useCallback(async () => {
    if (!result) return
    const currentRequest = requestVersion.current
    setDeleting(true)
    setError(null)
    try {
      await deleteTrackedSubmission(result)
      if (currentRequest !== requestVersion.current) return
      setResult(null)
      setEditingVersion(null)
      setDeleteOpen(false)
      setNotice("The submission has been deleted.")
    } catch (err) {
      if (currentRequest !== requestVersion.current) return
      setDeleteOpen(false)
      setError(err instanceof Error ? err.message : "Failed to delete the submission")
    } finally {
      if (currentRequest === requestVersion.current) setDeleting(false)
    }
  }, [result])

  return {
    state: { code, result, loading, error, notFound, searched, editing: editingVersion !== null, deleteOpen, deleting, notice, canModify: result ? canRequesterModify(result) : false },
    actions: { setCode: updateCode, lookup, beginEdit, cancelEdit, handleSaved, openDelete, closeDelete, remove },
  }
}
