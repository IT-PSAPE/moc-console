import { useBroadcastPlaybackContext } from "./broadcast-playback-provider"

/**
 * Playback runs on two media elements so the next item can preload while the
 * current one plays. Ended and error events only count for the deck that is
 * actually on air — the idle deck fires them while it buffers a preload.
 */
export function useBroadcastDecks() {
  const { state, actions } = useBroadcastPlaybackContext()
  const { activeDeck, deckItems } = state
  const { handleMediaError, moveToNext, setFirstMediaElement, setSecondMediaElement } = actions

  function handleFirstEnded() {
    if (activeDeck === 0) moveToNext()
  }

  function handleSecondEnded() {
    if (activeDeck === 1) moveToNext()
  }

  function handleFirstError() {
    if (activeDeck === 0) handleMediaError()
  }

  function handleSecondError() {
    if (activeDeck === 1) handleMediaError()
  }

  return {
    firstSource: deckItems[0]?.publicUrl,
    isFirstActive: activeDeck === 0,
    isSecondActive: activeDeck === 1,
    onFirstEnded: handleFirstEnded,
    onFirstError: handleFirstError,
    onSecondEnded: handleSecondEnded,
    onSecondError: handleSecondError,
    secondSource: deckItems[1]?.publicUrl,
    setFirstMediaElement,
    setSecondMediaElement,
  }
}
