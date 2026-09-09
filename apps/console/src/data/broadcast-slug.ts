export function createBroadcastSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)

  const suffix = Math.random().toString(36).slice(2, 8)
  return `${base || "broadcast"}-${suffix}`
}
