import type { PoolClient } from "pg"
import type { WorkspacePermission } from "../workspace-access.js"

export type PlatformContext = {
  db: PoolClient
  userId: string
  workspaceId: string
}

export type PlatformOperation = {
  permission: WorkspacePermission | "can_write" | "authenticated" | "public"
  run: (context: PlatformContext, input: unknown) => Promise<unknown>
}
