export function getNextPlaybackIndex(total: number, activeIndex: number, loopEnabled: boolean): number | null {
  if (total <= 0) {
    return null
  }

  const nextIndex = activeIndex + 1

  if (nextIndex < total) {
    return nextIndex
  }

  return loopEnabled ? 0 : null
}

export function getPreloadIndices(total: number, activeIndex: number, preloadCount: number, loopEnabled: boolean): number[] {
  const indices: number[] = []
  const seen = new Set<number>()
  let cursor = activeIndex

  for (let offset = 0; offset < preloadCount; offset += 1) {
    const nextIndex = getNextPlaybackIndex(total, cursor, loopEnabled)

    if (nextIndex === null || nextIndex === activeIndex || seen.has(nextIndex)) {
      break
    }

    indices.push(nextIndex)
    seen.add(nextIndex)
    cursor = nextIndex
  }

  return indices
}
