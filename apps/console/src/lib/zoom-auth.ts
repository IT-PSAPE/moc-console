import { moc } from "@/lib/moc-client"

export async function exchangeZoomCodeForTokens(code: string, redirectUri: string, workspaceId: string): Promise<void> {
  await moc.integrations.exchangeZoomCode(code, redirectUri, workspaceId)
}
