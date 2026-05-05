import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { upsertGoogleCalendarIntegration } = vi.hoisted(() => ({
  upsertGoogleCalendarIntegration: vi.fn(),
}));

vi.mock("@/lib/workspace-calendar", () => ({
  upsertGoogleCalendarIntegration,
}));

describe("GET /api/auth/google/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();

    process.env.GOOGLE_CLIENT_ID = "google-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";
    process.env.NEXT_PUBLIC_BASE_URL = "https://earlymark.ai";
    upsertGoogleCalendarIntegration.mockResolvedValue(undefined);
  });

  async function loadRoute() {
    return import("@/app/api/auth/google/callback/route");
  }

  it("redirects provider errors back to settings", async () => {
    const { GET } = await loadRoute();
    const response = await GET(
      new NextRequest("https://earlymark.ai/api/auth/google/callback?error=access_denied"),
    );

    expect(response.headers.get("location")).toBe(
      "https://earlymark.ai/crm/settings?error=access_denied",
    );
  });

  it("redirects when code or state is missing", async () => {
    const { GET } = await loadRoute();
    const response = await GET(
      new NextRequest("https://earlymark.ai/api/auth/google/callback?code=abc"),
    );

    expect(response.headers.get("location")).toBe(
      "https://earlymark.ai/crm/settings?error=missing_code_or_state",
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
      new NextRequest("https://earlymark.ai/api/auth/google/callback?code=abc&state=ws_1"),
    );

    expect(response.headers.get("location")).toBe(
      "https://earlymark.ai/crm/settings?error=token_exchange_failed",
    );
  });

  it("stores tokens and redirects on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: "access",
          refresh_token: "refresh",
          expires_in: 3600,
        }),
      }),
    );

    const { GET } = await loadRoute();
    const response = await GET(
      new NextRequest("https://earlymark.ai/api/auth/google/callback?code=abc&state=ws_1"),
    );

    expect(response.headers.get("location")).toBe(
      "https://earlymark.ai/crm/settings/integrations?success=google_calendar_connected",
    );
    expect(upsertGoogleCalendarIntegration).toHaveBeenCalledWith({
      workspaceId: "ws_1",
      accessToken: "access",
      refreshToken: "refresh",
      expiresInSeconds: 3600,
      calendarId: "primary",
    });
  });

  it("redirects callback failures back to integrations", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("oauth offline")));

    const { GET } = await loadRoute();
    const response = await GET(
      new NextRequest("https://earlymark.ai/api/auth/google/callback?code=abc&state=ws_1"),
    );

    expect(response.headers.get("location")).toBe(
      "https://earlymark.ai/crm/settings/integrations?error=callback_failed",
    );
  });
});
