export function getBroadcastPublicUrl(slug: string): string | null {
  const baseUrl = import.meta.env.VITE_BROADCAST_APP_URL?.trim()

  if (!baseUrl) {
    return null
  }

  return `${baseUrl.replace(/\/+$/g, "")}/${slug}`
}
