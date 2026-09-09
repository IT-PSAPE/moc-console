import { cn } from "@moc/utils/cn"
import { useBroadcastDecks } from "./use-broadcast-decks"

const deckClassName = "absolute inset-0 size-full object-contain transition-opacity duration-150 motion-reduce:transition-none"

export function BroadcastVideoDecks() {
  const {
    firstSource,
    isFirstActive,
    isSecondActive,
    onFirstEnded,
    onFirstError,
    onSecondEnded,
    onSecondError,
    secondSource,
    setFirstMediaElement,
    setSecondMediaElement,
  } = useBroadcastDecks()

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-tertiary">
      <video
        ref={setFirstMediaElement}
        aria-hidden={!isFirstActive}
        className={cn(deckClassName, isFirstActive ? "opacity-100" : "opacity-0")}
        playsInline
        preload="auto"
        src={firstSource}
        onEnded={onFirstEnded}
        onError={onFirstError}
      />
      <video
        ref={setSecondMediaElement}
        aria-hidden={!isSecondActive}
        className={cn(deckClassName, isSecondActive ? "opacity-100" : "opacity-0")}
        playsInline
        preload="auto"
        src={secondSource}
        onEnded={onSecondEnded}
        onError={onSecondError}
      />
    </div>
  )
}
