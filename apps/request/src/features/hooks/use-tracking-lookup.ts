import { useState, useCallback } from 'react'
import { lookupTrackingCode } from '@/data/lookup-tracking'
import type { TrackingResult } from '@/types/booking'

export function useTrackingLookup() {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<TrackingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [searched, setSearched] = useState(false)

  const lookup = useCallback(async () => {
    if (!code.trim()) return

    setLoading(true)
    setError(null)
    setNotFound(false)
    setResult(null)
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

  return { code, setCode, result, loading, error, notFound, searched, lookup }
}
