import { useEffect, useState } from 'react'
import { fetchBookingById } from '@/data/fetch-equipment'
import type { Booking } from '@moc/types/equipment'

export function useBookingDetail(id: string | undefined) {
  const [booking, setBooking] = useState<Booking | null>(null)
  const [loadedId, setLoadedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchBookingById(id ?? '').then((result) => {
      if (!cancelled) {
        setBooking(result ?? null)
        setLoadedId(id ?? null)
      }
    })
    return () => { cancelled = true }
  }, [id])

  return { state: { booking, isLoading: loadedId !== (id ?? null) } }
}
