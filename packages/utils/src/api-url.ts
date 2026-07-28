// Every server-side endpoint lives in the MOC API app, deployed on its own
// origin. `VITE_API_BASE_URL` points at it (e.g. https://api.psape.co.zw).
//
// When unset, paths stay relative and resolve against the current origin.
// That keeps `vercel dev` and any same-origin proxy working unchanged, and
// means a missing env var degrades to the pre-split behaviour rather than
// producing a URL like "undefined/api/…".

function baseUrl(): string {
  const configured = import.meta.env?.VITE_API_BASE_URL
  return typeof configured === "string" ? configured.trim().replace(/\/$/, "") : ""
}

/**
 * Builds an absolute URL for an API path.
 *
 * @param path A root-relative path, with or without the leading slash
 *             (`/api/notify/request` or `api/notify/request`).
 */
export function apiUrl(path: string): string {
  const suffix = path.startsWith("/") ? path : `/${path}`
  return `${baseUrl()}${suffix}`
}
