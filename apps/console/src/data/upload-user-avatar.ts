import { moc } from "../lib/moc-client"

export async function uploadUserAvatarStorage(file: Blob, signal?: AbortSignal): Promise<{ url: string }> {
  const result = await moc.storage.upload({ purpose: "avatar", file, signal })
  return { url: result.url }
}
