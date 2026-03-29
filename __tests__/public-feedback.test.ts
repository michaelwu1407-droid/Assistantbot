import { afterEach, describe, expect, it, vi } from "vitest"

describe("public feedback token helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.useRealTimers()
  })

  it("round-trips a signed feedback token", async () => {
    vi.stubEnv("CRON_SECRET", "test-secret")

    const { createPublicFeedbackToken, verifyPublicFeedbackToken } = await import("@/lib/public-feedback")

    const token = createPublicFeedbackToken({
      dealId: "deal_123",
      contactId: "contact_123",
      workspaceId: "workspace_123",
      expiresInDays: 7,
    })

    expect(verifyPublicFeedbackToken(token)).toEqual(
      expect.objectContaining({
        dealId: "deal_123",
        contactId: "contact_123",
        workspaceId: "workspace_123",
      }),
    )
  })

  it("rejects expired tokens", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-29T00:00:00.000Z"))
    vi.stubEnv("CRON_SECRET", "test-secret")

    const { createPublicFeedbackToken, verifyPublicFeedbackToken } = await import("@/lib/public-feedback")

    const token = createPublicFeedbackToken({
      dealId: "deal_123",
      contactId: "contact_123",
      workspaceId: "workspace_123",
      expiresInDays: 1,
    })

    vi.setSystemTime(new Date("2026-03-31T00:00:00.000Z"))

    expect(verifyPublicFeedbackToken(token)).toBeNull()
  })

  it("builds a public feedback URL with the signed token", async () => {
    vi.stubEnv("CRON_SECRET", "test-secret")
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://earlymark.ai")

    const { buildPublicFeedbackUrl } = await import("@/lib/public-feedback")

    const url = buildPublicFeedbackUrl({
      dealId: "deal_123",
      contactId: "contact_123",
      workspaceId: "workspace_123",
    })

    expect(url).toMatch(/^https:\/\/earlymark\.ai\/feedback\//)
  })
})
