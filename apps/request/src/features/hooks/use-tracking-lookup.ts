import { useState, useCallback } from 'react'
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
  const [editing, setEditing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const lookup = useCallback(async () => {
    if (!code.trim()) return

    setLoading(true)
    setError(null)
    setNotFound(false)
    setResult(null)
    setEditing(false)
    setNotice(null)
    setSearched(true)

    try {
      const data = await lookupTrackingCode(code)
      if (data) {
        setResult(data)
      } else {
        setNotFound(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to look up tracking code')
    } finally {
      setLoading(false)
    }
  }, [code])

  function beginEdit() {
    setEditing(true)
    setNotice(null)
  }

  function cancelEdit() {
    setEditing(false)
  }

  function handleSaved(submission: TrackingResult) {
    setResult(submission)
    setEditing(false)
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
    setDeleting(true)
    setError(null)
    try {
      await deleteTrackedSubmission(result)
      setResult(null)
      setEditing(false)
      setDeleteOpen(false)
      setNotice("The submission has been deleted.")
    } catch (err) {
      setDeleteOpen(false)
      setError(err instanceof Error ? err.message : "Failed to delete the submission")
    } finally {
      setDeleting(false)
    }
  }, [result])

  return {
    state: { code, result, loading, error, notFound, searched, editing, deleteOpen, deleting, notice, canModify: result ? canRequesterModify(result) : false },
    actions: { setCode, lookup, beginEdit, cancelEdit, handleSaved, openDelete, closeDelete, remove },
  }
}
