import { supabase } from '@/lib/supabase'
import type { TrackingResult } from '@/types/booking'

export async function lookupTrackingCode(code: string): Promise<TrackingResult | null> {
  const { data, error } = await supabase.rpc('public_lookup_tracking', {
    p_tracking_code: code.trim(),
  })

  if (error) throw new Error(error.message)
  if (!data) return null

  return data as TrackingResult
}
