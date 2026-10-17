/**
 * Brand-coloured per the design system: a solid `bg-brand_solid` line reads as
 * an active drop target at a glance, distinct from the neutral drag-handle grays.
 */
export function DropIndicatorLine() {
  return (
    <div className="pointer-events-none relative z-10 h-0">
      <div className="absolute inset-x-3 -top-px h-0.5 rounded-full bg-brand_solid" />
      <div className="absolute left-2 -top-1 size-2.5 rounded-full bg-brand_solid" />
      <div className="absolute right-2 -top-1 size-2.5 rounded-full bg-brand_solid" />
    </div>
  );
}
