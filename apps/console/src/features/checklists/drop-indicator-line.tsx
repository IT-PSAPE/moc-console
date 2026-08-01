export function DropIndicatorLine() {
  return (
    <div className="pointer-events-none relative z-10 h-0">
      <div className="absolute inset-x-3 -top-px h-0.5 rounded-full bg-brand" />
      <div className="absolute left-2 -top-1 size-2.5 rounded-full bg-brand" />
      <div className="absolute right-2 -top-1 size-2.5 rounded-full bg-brand" />
    </div>
  );
}
