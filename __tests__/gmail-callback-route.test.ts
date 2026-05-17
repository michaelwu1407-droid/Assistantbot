import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  upsertEmailIntegrationFromOAuth: vi.fn(),
  finalizeEmailIntegrationSetup: vi.fn(),
}));

vi.mock("@/lib/email-integrations", () => ({
  normalizeEmailProvider: (value: string) => (value === "gmail" || value === "outlook" ? value : null),
  resolveMicrosoftUserEmail: vi.fn(),
  upsertEmailIntegrationFromOAuth: hoisted.upsertEmailIntegrationFromOAuth,
  finalizeEmailIntegrationSetup: hoisted.finalizeEmailIntegrationSetup,
}));

vi.mock("@/lib/oauth-state", () => ({
  // Tests build state as URL-encoded JSON; treat that as valid in this test suite.
  verifyOAuthState: (raw: string | null | undefined) => {
    if (!raw) return { ok: false, reason: "missing" } as const;
    try {
      const payload = JSON.parse(raw) as { userId?: string; provider?: string };
      return { ok: true, payload: { ...payload, iat: 0, exp: 9_999_999_999, nonce: "test" } } as const;
    } catch {
      return { ok: false, reason: "malformed" } as const;
    }
  },
}));

describe("GET /api/auth/gmail/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();

    process.env.NEXT_PUBLIC_APP_URL = "https://earlymark.ai";
    process.env.GMAIL_CLIENT_ID = "gmail-client-id";
    process.env.GMAIL_CLIENT_SECRET = "gmail-client-secret";
    process.env.OUTLOOK_CLIENT_ID = "outlook-client-id";
    process.env.OUTLOOK_CLIENT_SECRET = "outlook-client-secret";

    hoisted.upsertEmailIntegrationFromOAuth.mockResolvedValue({ id: "integration_1" });
    hoisted.finalizeEmailIntegrationSetup.mockResolvedValue(undefined);
  });

  async function loadRoute() {
    return import("@/app/api/auth/gmail/callback/route");
  }

  it("redirects provider errors back to integrations", async () => {
    const { GET } = await loadRoute();
    const response = await GET(
      new NextRequest("https://earlymark.ai/api/auth/gmail/callback?error=access_denied"),
    );

    expect(response.headers.get("location")).toBe(
      "https://earlymark.ai/crm/settings/integrations?error=access_denied",
    );
  });

  it("redirects when params are missing", async () => {
    const { GET } = await loadRoute();
    const response = await GET(
      new NextRequest("https://earlymark.ai/api/auth/gmail/callback?code=abc"),
    );

    expect(response.headers.get("location")).toBe(
      "https://earlymark.ai/crm/settings/integrations?error=missing_params",
    );
  });

  it("stores encrypted Gmail tokens and redirects on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue({
            access_token: "access_token",
            refresh_token: "refresh_token",
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue({ email: "miguel@example.com" }),
        }),
    );

    const { GET } = await loadRoute();
    const response = await GET(
      new NextRequest(
        "https://earlymark.ai/api/auth/gmail/callback?code=abc&state=%7B%22userId%22%3A%22user_1%22%2C%22provider%22%3A%22gmail%22%7D",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://earlymark.ai/crm/settings/integrations?success=gmail_connected&focus=lead_channels",
    );
    expect(hoisted.upsertEmailIntegrationFromOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        provider: "gmail",
        emailAddress: "miguel@example.com",
      }),
    );
    expect(hoisted.finalizeEmailIntegrationSetup).toHaveBeenCalledWith({
      userId: "user_1",
      provider: "gmail",
      integrationId: "integration_1",
    });
  });

  it("redirects oauth failures back to integrations", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({
          error: "invalid_grant",
          error_description: "bad code",
        }),
      }),
    );

    const { GET } = await loadRoute();
    const response = await GET(
      new NextRequest(
        "https://earlymark.ai/api/auth/gmail/callback?code=abc&state=%7B%22userId%22%3A%22user_1%22%2C%22provider%22%3A%22gmail%22%7D",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://earlymark.ai/crm/settings/integrations?error=oauth_failed",
    );
  });

  it("still redirects to success with a warning when automation setup fails", async () => {
    hoisted.finalizeEmailIntegrationSetup.mockRejectedValueOnce(new Error("watch setup failed"));
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue({
            access_token: "access_token",
            refresh_token: "refresh_token",
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue({ email: "miguel@example.com" }),
        }),
    );

    const { GET } = await loadRoute();
    const response = await GET(
      new NextRequest(
        "https://earlymark.ai/api/auth/gmail/callback?code=abc&state=%7B%22userId%22%3A%22user_1%22%2C%22provider%22%3A%22gmail%22%7D",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://earlymark.ai/crm/settings/integrations?success=gmail_connected&focus=lead_channels&warning=gmail_automation_setup_incomplete",
    );
  });
});
