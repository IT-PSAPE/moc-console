const PLACEHOLDER_TIME = "--:--"

function toClock(totalSeconds: number): string {
  const wholeSeconds = Math.floor(totalSeconds)
  const minutes = Math.floor(wholeSeconds / 60)
  const seconds = wholeSeconds % 60

  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

export function formatElapsedTime(elapsedSeconds: number, durationSeconds: number): string {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return PLACEHOLDER_TIME

  return toClock(Math.min(Math.max(elapsedSeconds, 0), durationSeconds))
}

export function formatRemainingTime(elapsedSeconds: number, durationSeconds: number): string {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return PLACEHOLDER_TIME

  return `-${toClock(Math.max(durationSeconds - elapsedSeconds, 0))}`
}

/**
 * Items are named after the uploaded file, so the extension is always along for
 * the ride. Only the extension is dropped — anything else in the name is what
 * the operator chose to call the item.
 */
export function formatItemTitle(title: string): string {
  return title.replace(/\.[a-z0-9]{2,4}$/i, "") || title
}
