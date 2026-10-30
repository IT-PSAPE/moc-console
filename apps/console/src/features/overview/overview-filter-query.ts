import type { OverviewItemKind } from '@moc/sdk/users'
import { normalizeOverviewItemKinds } from '../preferences/overview-item-options'

export function getOverviewFilterKinds(params: URLSearchParams, scope: string, saved: OverviewItemKind[], allowed: OverviewItemKind[]): { kinds: OverviewItemKind[]; overridden: boolean } {
  const raw = params.get('show')
  const requested = raw === null ? [] : normalizeOverviewItemKinds(raw.split(','))
  const overridden = params.get('overviewScope') === scope && raw !== null && (raw === '' || requested.length > 0)
  return { kinds: (overridden ? requested : saved).filter((kind) => allowed.includes(kind)), overridden }
}

export function updateOverviewFilterQuery(params: URLSearchParams, scope: string, kinds: OverviewItemKind[] | null): URLSearchParams {
  const next = new URLSearchParams(params)
  if (kinds === null) {
    next.delete('show')
    next.delete('overviewScope')
  } else {
    next.set('show', kinds.join(','))
    next.set('overviewScope', scope)
  }
  return next
}
