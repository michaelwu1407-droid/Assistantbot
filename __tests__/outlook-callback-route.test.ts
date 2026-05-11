import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  upsertEmailIntegrationFromOAuth: vi.fn(),
  finalizeEmailIntegrationSetup: vi.fn(),
}));

vi.mock("@/lib/email-integrations", () => ({
  normalizeEmailProvider: (value: string) => (value === "gmail" || value === "outlook" ? value : null),
  resolveMicrosoftUserEmail: (payload: { mail?: string; userPrincipalName?: string }) =>
    payload.mail || payload.userPrincipalName || null,
  upsertEmailIntegrationFromOAuth: hoisted.upsertEmailIntegrationFromOAuth,
  finalizeEmailIntegrationSetup: hoisted.finalizeEmailIntegrationSetup,
}));

vi.mock("@/lib/oauth-state", () => ({
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

describe("GET /api/auth/outlook/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();

    process.env.NEXT_PUBLIC_APP_URL = "https://earlymark.ai";
    process.env.OUTLOOK_CLIENT_ID = "outlook-client-id";
    process.env.OUTLOOK_CLIENT_SECRET = "outlook-client-secret";

    hoisted.upsertEmailIntegrationFromOAuth.mockResolvedValue({ id: "integration_1" });
    hoisted.finalizeEmailIntegrationSetup.mockResolvedValue(undefined);
  });

  async function loadRoute() {
    return import("@/app/api/auth/outlook/callback/route");
  }

  it("redirects provider errors back to integrations", async () => {
    const { GET } = await loadRoute();

    const response = await GET(
      new NextRequest("https://earlymark.ai/api/auth/outlook/callback?error=access_denied"),
    );

    expect(response.headers.get("location")).toBe(
      "https://earlymark.ai/crm/settings/integrations?error=access_denied",
    );
  });

  it("redirects when code or state is missing", async () => {
    const { GET } = await loadRoute();

    const response = await GET(
      new NextRequest("https://earlymark.ai/api/auth/outlook/callback?code=abc"),
    );

    expect(response.headers.get("location")).toBe(
      "https://earlymark.ai/crm/settings/integrations?error=missing_params",
    );
  });

  it("stores encrypted Outlook tokens and redirects on success", async () => {
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
          json: vi.fn().mockResolvedValue({ mail: "miguel@example.com" }),
        }),
    );

    const { GET } = await loadRoute();

    const response = await GET(
      new NextRequest(
        "https://earlymark.ai/api/auth/outlook/callback?code=abc&state=%7B%22userId%22%3A%22user_1%22%2C%22provider%22%3A%22outlook%22%7D",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://earlymark.ai/crm/settings/integrations?success=outlook_connected",
    );
    expect(hoisted.upsertEmailIntegrationFromOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_1",
        provider: "outlook",
        emailAddress: "miguel@example.com",
      }),
    );
    expect(hoisted.finalizeEmailIntegrationSetup).toHaveBeenCalledWith({
      userId: "user_1",
      provider: "outlook",
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
        "https://earlymark.ai/api/auth/outlook/callback?code=abc&state=%7B%22userId%22%3A%22user_1%22%2C%22provider%22%3A%22outlook%22%7D",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://earlymark.ai/crm/settings/integrations?error=oauth_failed",
    );
  });
});
