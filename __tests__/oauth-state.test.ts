import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { signOAuthState, verifyOAuthState, verifyWorkspaceState } from "@/lib/oauth-state"

const ORIGINAL_SECRET = process.env.OAUTH_STATE_SECRET

beforeEach(() => {
  process.env.OAUTH_STATE_SECRET = "test-secret-do-not-use-in-prod"
})

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.OAUTH_STATE_SECRET
  else process.env.OAUTH_STATE_SECRET = ORIGINAL_SECRET
})

describe("oauth-state", () => {
  it("signs and verifies a payload round-trip", () => {
    const token = signOAuthState({ workspaceId: "ws_1", userId: "u_1", provider: "xero" })
    const result = verifyOAuthState(token)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.payload.workspaceId).toBe("ws_1")
      expect(result.payload.userId).toBe("u_1")
      expect(result.payload.provider).toBe("xero")
      expect(typeof result.payload.exp).toBe("number")
      expect(typeof result.payload.nonce).toBe("string")
    }
  })

  it("rejects a missing token", () => {
    const result = verifyOAuthState(null)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe("missing")
  })

  it("rejects a malformed token", () => {
    const result = verifyOAuthState("not-a-valid-token")
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe("malformed")
  })

  it("rejects a token signed with a different secret", () => {
    const token = signOAuthState({ workspaceId: "ws_1" })
    process.env.OAUTH_STATE_SECRET = "a-different-secret"
    const result = verifyOAuthState(token)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe("bad_signature")
  })

  it("rejects a token after its expiry passes", () => {
    const token = signOAuthState({ workspaceId: "ws_1" }, { ttlSeconds: -1 })
    const result = verifyOAuthState(token)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe("expired")
  })

  it("verifyWorkspaceState returns the workspaceId when valid, null otherwise", () => {
    const token = signOAuthState({ workspaceId: "ws_42" })
    expect(verifyWorkspaceState(token)).toBe("ws_42")
    expect(verifyWorkspaceState("garbage")).toBeNull()
    expect(verifyWorkspaceState(null)).toBeNull()
  })
})
