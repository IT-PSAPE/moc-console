export function getOverviewGreeting(name: string | null | undefined, now: Date): string {
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  return name?.trim() ? `${greeting}, ${name.trim()}` : greeting
}

export function getOverviewDateLabel(now: Date): string {
  return new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(now)
}
