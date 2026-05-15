const workspaceId = import.meta.env.VITE_WORKSPACE_ID

if (!workspaceId) {
  throw new Error("Missing VITE_WORKSPACE_ID environment variable")
}

export { workspaceId }
