import { withActor } from "@moc/backend/database"
import { requireAuthenticatedUser } from "../../server/auth-guard.js"
import { isAllowedOrigin } from "../../server/cors.js"
import { requireWorkspacePermission } from "../../server/workspace-access.js"
import { createPlatformHandler } from "../../server/platform/handler.js"
import { platformRegistry } from "../../server/platform/registry.js"
import { guardPublicOperation } from "../../server/platform/rate-limit.js"

export default createPlatformHandler(platformRegistry, {
  withActor, isAllowedOrigin, authenticate: requireAuthenticatedUser,
  authorize: requireWorkspacePermission, guardPublicOperation,
})
