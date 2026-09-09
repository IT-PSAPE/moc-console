/**
 * Neutral rather than brand, and drawn in the text-quaternary gray rather than a
 * background gray: the indicator sits on the panel's own `bg-primary` surface,
 * where every `bg-*` neutral is within ~1.3:1 of it in one of the two themes and
 * so disappears. Quaternary text gray clears 4.9:1 on white and 6.3:1 on gray-950,
 * and is already the colour of the drag grip.
 */
export function DropIndicatorLine() {
  return (
    <div className="pointer-events-none relative z-10 h-0 text-quaternary">
      <div className="absolute inset-x-3 -top-px h-0.5 rounded-full bg-current" />
      <div className="absolute left-2 -top-1 size-2.5 rounded-full bg-current" />
      <div className="absolute right-2 -top-1 size-2.5 rounded-full bg-current" />
    </div>
  );
}
