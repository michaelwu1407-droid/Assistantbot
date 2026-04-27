import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  getXeroOAuthRedirectUri: vi.fn(),
  storeXeroTokens: vi.fn(),
}));

vi.mock("@/lib/xero", () => ({
  getXeroOAuthRedirectUri: hoisted.getXeroOAuthRedirectUri,
  storeXeroTokens: hoisted.storeXeroTokens,
}));

describe("GET /api/auth/xero/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();

    process.env.XERO_CLIENT_ID = "xero-client-id";
    process.env.XERO_CLIENT_SECRET = "xero-client-secret";
    hoisted.getXeroOAuthRedirectUri.mockReturnValue("https://earlymark.ai/api/auth/xero/callback");
    hoisted.storeXeroTokens.mockResolvedValue(undefined);
  });

  async function loadRoute() {
    return import("@/app/api/auth/xero/callback/route");
  }

  it("redirects provider errors back to integrations", async () => {
    const { GET } = await loadRoute();

    const response = await GET(
      new NextRequest("https://earlymark.ai/api/auth/xero/callback?error=access_denied"),
    );

    expect(response.headers.get("location")).toBe(
      "https://earlymark.ai/crm/settings/integrations?error=access_denied",
    );
  });

  it("redirects when code or state is missing", async () => {
    const { GET } = await loadRoute();

    const response = await GET(
      new NextRequest("https://earlymark.ai/api/auth/xero/callback?code=abc"),
    );

    expect(response.headers.get("location")).toBe(
      "https://earlymark.ai/crm/settings/integrations?error=missing_code_or_state",
    );
  });

  it("redirects when token exchange fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        text: vi.fn().mockResolvedValue("invalid_grant"),
      }),
    );

    const { GET } = await loadRoute();
    const response = await GET(
      new NextRequest("https://earlymark.ai/api/auth/xero/callback?code=abc&state=ws_1"),
    );

    expect(response.headers.get("location")).toBe(
      "https://earlymark.ai/crm/settings/integrations?error=token_exchange_failed",
    );
  });

  it("redirects when no tenant is available", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            access_token: "access",
            refresh_token: "refresh",
            expires_in: 1800,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue([]),
        }),
    );

    const { GET } = await loadRoute();
    const response = await GET(
      new NextRequest("https://earlymark.ai/api/auth/xero/callback?code=abc&state=ws_1"),
    );

    expect(response.headers.get("location")).toBe(
      "https://earlymark.ai/crm/settings/integrations?error=no_xero_organisation",
    );
  });

  it("stores Xero tokens and redirects on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue({
            access_token: "access",
            refresh_token: "refresh",
            expires_in: 1800,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: vi.fn().mockResolvedValue([{ tenantId: "tenant_123" }]),
        }),
    );

    const { GET } = await loadRoute();
    const response = await GET(
      new NextRequest("https://earlymark.ai/api/auth/xero/callback?code=abc&state=ws_1"),
    );

    expect(response.headers.get("location")).toBe(
      "https://earlymark.ai/crm/settings/integrations?success=xero_connected",
    );
    expect(hoisted.storeXeroTokens).toHaveBeenCalledWith("ws_1", {
      access_token: "access",
      refresh_token: "refresh",
      expires_in: 1800,
      tenant_id: "tenant_123",
    });
  });

  it("redirects callback failures back to integrations", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("xero offline")));

    const { GET } = await loadRoute();
    const response = await GET(
      new NextRequest("https://earlymark.ai/api/auth/xero/callback?code=abc&state=ws_1"),
    );

    expect(response.headers.get("location")).toBe(
      "https://earlymark.ai/crm/settings/integrations?error=callback_failed",
    );
  });
});
