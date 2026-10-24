import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, expect, test, vi } from "vitest"
import { createMockReactModule } from "../../../../broadcast/src/features/test-hook-runtime"

vi.doMock("react", () => ({ ...React, ...createMockReactModule() }))
vi.doMock("../../../../../../apps/console/src/screens/auth/use-login", () => ({
  useLogin: () => ({ state: { error: "", loading: false }, actions: { signIn: vi.fn() } }),
}))

const { LoginScreen } = await import("../../../../../../apps/console/src/screens/auth/login")

afterEach(() => vi.restoreAllMocks())

test("login offers Google sign-in without email, password, signup, or recovery controls", () => {
  const markup = renderToStaticMarkup(React.createElement(LoginScreen))
  expect(markup).toContain("Continue with Google")
  expect(markup).toContain("Use the Google account invited to your workspace.")
  expect(markup).not.toContain("type=\"password\"")
  expect(markup).not.toContain("Sign up")
  expect(markup).not.toContain("Forgot password")
})
