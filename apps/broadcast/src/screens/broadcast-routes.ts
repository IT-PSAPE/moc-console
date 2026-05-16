// MOC Broadcast routing. No workspace slug — the chooser lists
// workspaces (anon RPC) and the picked workspace id is carried in the
// path so the home and player views are deep-linkable / refresh-safe.
export const routes = {
  chooser: '/',
  home: '/:workspaceId',
  player: '/:workspaceId/play/:playlistId',
}

export function homePath(workspaceId: string): string {
  return `/${workspaceId}`
}

export function playerPath(workspaceId: string, playlistId: string): string {
  return `/${workspaceId}/play/${playlistId}`
}
