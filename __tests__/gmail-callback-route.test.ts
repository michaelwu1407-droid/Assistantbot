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

    hoisted.encrypt.mockImplementation((value: string) => `enc:${value}`);
    hoisted.db.emailIntegration.upsert.mockResolvedValue(undefined);
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
      "https://earlymark.ai/crm/settings/integrations?success=gmail_connected",
    );
    expect(hoisted.db.emailIntegration.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_provider: {
            userId: "user_1",
            provider: "gmail",
          },
        },
      }),
    );
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
});
