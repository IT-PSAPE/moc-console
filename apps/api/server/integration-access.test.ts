import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  markIntegrationReauthRequiredForStoredToken,
  markIntegrationReauthRequiredIfRefreshTokenCurrent,
} from "./integration-access.js"

const STORED_TOKENS = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  tokenExpiresAt: "2026-08-05T18:00:00.000Z",
}

describe("Zoom refresh-token reauth state", () => {
  it("does not mark reauth after another worker completes an expired refresh lease", async () => {
    const marked = await markIntegrationReauthRequiredIfRefreshTokenCurrent(
      "zoom",
      "workspace-id",
      STORED_TOKENS.refreshToken,
      {
        async getIntegrationTokens() {
          return STORED_TOKENS
        },
        async markIntegrationReauthRequiredIfRefreshTokenMatches(_provider, workspaceId, refreshToken) {
          assert.equal(workspaceId, "workspace-id")
          assert.equal(refreshToken, STORED_TOKENS.refreshToken)
          // The atomic RPC sees credentials another worker has already saved.
          return false
        },
      },
    )

    assert.equal(marked, false)
  })

  it("marks reauth when the rejected Zoom refresh token is still current", async () => {
    const markedWorkspaces: string[] = []
    const marked = await markIntegrationReauthRequiredIfRefreshTokenCurrent(
      "zoom",
      "workspace-id",
      STORED_TOKENS.refreshToken,
      {
        async getIntegrationTokens() {
          return STORED_TOKENS
        },
        async markIntegrationReauthRequiredIfRefreshTokenMatches(_provider, workspaceId, refreshToken) {
          assert.equal(refreshToken, STORED_TOKENS.refreshToken)
          markedWorkspaces.push(workspaceId)
          return true
        },
      },
    )

    assert.equal(marked, true)
    assert.deepEqual(markedWorkspaces, ["workspace-id"])
  })

  it("does not mark reauth when a second 401 used an access token another worker replaced", async () => {
    let markCalled = false
    const marked = await markIntegrationReauthRequiredForStoredToken(
      "zoom",
      "workspace-id",
      "failed-access-token",
      {
        async getIntegrationTokens() {
          return {
            ...STORED_TOKENS,
            accessToken: "rotated-access-token",
            refreshToken: "rotated-refresh-token",
          }
        },
        async markIntegrationReauthRequiredIfRefreshTokenMatches() {
          markCalled = true
          return true
        },
      },
    )

    assert.equal(marked, false)
    assert.equal(markCalled, false)
  })
})
