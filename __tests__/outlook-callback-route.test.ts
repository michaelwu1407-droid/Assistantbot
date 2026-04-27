import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  db: {
    emailIntegration: {
      upsert: vi.fn(),
    },
  },
  encrypt: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: hoisted.db,
}));

vi.mock("@/lib/encryption", () => ({
  encrypt: hoisted.encrypt,
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

    hoisted.encrypt.mockImplementation((value: string) => `enc:${value}`);
    hoisted.db.emailIntegration.upsert.mockResolvedValue(undefined);
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
        "https://earlymark.ai/api/auth/outlook/callback?code=abc&state=%7B%22userId%22%3A%22user_1%22%2C%22provider%22%3A%22OUTLOOK%22%7D",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://earlymark.ai/crm/settings/integrations?success=OUTLOOK_connected",
    );
    expect(hoisted.db.emailIntegration.upsert).toHaveBeenCalledWith({
      where: {
        userId_provider: {
          userId: "user_1",
          provider: "OUTLOOK",
        },
      },
      update: expect.objectContaining({
        emailAddress: "miguel@example.com",
        accessToken: "enc:access_token",
        refreshToken: "enc:refresh_token",
        isActive: true,
      }),
      create: expect.objectContaining({
        userId: "user_1",
        provider: "OUTLOOK",
        emailAddress: "miguel@example.com",
        accessToken: "enc:access_token",
        refreshToken: "enc:refresh_token",
      }),
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
        "https://earlymark.ai/api/auth/outlook/callback?code=abc&state=%7B%22userId%22%3A%22user_1%22%2C%22provider%22%3A%22OUTLOOK%22%7D",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://earlymark.ai/crm/settings/integrations?error=oauth_failed",
    );
  });
});
