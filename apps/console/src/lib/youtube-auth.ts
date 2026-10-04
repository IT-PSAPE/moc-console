import { moc } from "@/lib/moc-client"

export async function exchangeCodeForTokens(code: string, redirectUri: string, workspaceId: string): Promise<void> {
  await moc.integrations.exchangeYouTubeCode(code, redirectUri, workspaceId)
}

export async function revokeToken(workspaceId: string): Promise<void> {
  await moc.integrations.revokeYouTube(workspaceId)
}
