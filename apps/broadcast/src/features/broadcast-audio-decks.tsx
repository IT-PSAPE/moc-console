import { useBroadcastDecks } from "./use-broadcast-decks"

export function BroadcastAudioDecks() {
  const {
    firstSource,
    onFirstEnded,
    onFirstError,
    onSecondEnded,
    onSecondError,
    secondSource,
    setFirstMediaElement,
    setSecondMediaElement,
  } = useBroadcastDecks()

  return (
    <div className="sr-only" aria-hidden="true">
      <audio ref={setFirstMediaElement} preload="auto" src={firstSource} onEnded={onFirstEnded} onError={onFirstError} />
      <audio ref={setSecondMediaElement} preload="auto" src={secondSource} onEnded={onSecondEnded} onError={onSecondError} />
    </div>
  )
}
