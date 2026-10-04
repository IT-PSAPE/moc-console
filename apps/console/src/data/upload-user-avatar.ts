import { moc } from "../lib/moc-client"

export async function uploadUserAvatarStorage(file: Blob): Promise<{ url: string }> {
  const result = await moc.storage.upload({ purpose: "avatar", file })
  return { url: result.url }
}
