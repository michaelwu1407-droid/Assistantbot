import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { upsertGoogleCalendarIntegration } = vi.hoisted(() => ({
  upsertGoogleCalendarIntegration: vi.fn(),
}));

vi.mock("@/lib/workspace-calendar", () => ({
  upsertGoogleCalendarIntegration,
}));

import { GET } from "@/app/api/auth/google-calendar/callback/route";

describe("GET /api/auth/google-calendar/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    process.env.GOOGLE_CLIENT_ID = "google_client_id";
    process.env.GOOGLE_CLIENT_SECRET = "google_client_secret";
    process.env.NEXT_PUBLIC_APP_URL = "https://earlymark.ai";
    upsertGoogleCalendarIntegration.mockResolvedValue(undefined);
  });

  it("redirects callback errors back to integrations settings", async () => {
    const response = await GET(
      new NextRequest("https://earlymark.ai/api/auth/google-calendar/callback?error=access_denied"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://earlymark.ai/crm/settings/integrations?error=access_denied",
    );
  });

  it("redirects when code or state is missing", async () => {
    const response = await GET(
      new NextRequest("https://earlymark.ai/api/auth/google-calendar/callback?code=abc"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://earlymark.ai/crm/settings/integrations?error=missing_code_or_state",
    );
  });

  it("redirects when token exchange fails", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: vi.fn(),
    } as unknown as Response);

    const response = await GET(
      new NextRequest("https://earlymark.ai/api/auth/google-calendar/callback?code=abc&state=ws_1"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://earlymark.ai/crm/settings/integrations?error=token_exchange_failed",
    );
  });

  it("stores tokens and redirects on success", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          access_token: "access_token",
          refresh_token: "refresh_token",
          expires_in: 3600,
        }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ email: "miguel@example.com" }),
      } as unknown as Response);

    const response = await GET(
      new NextRequest("https://earlymark.ai/api/auth/google-calendar/callback?code=abc&state=ws_1"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://earlymark.ai/crm/settings/integrations?success=google_calendar_connected",
    );
    expect(upsertGoogleCalendarIntegration).toHaveBeenCalledWith({
      workspaceId: "ws_1",
      emailAddress: "miguel@example.com",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      expiresInSeconds: 3600,
      calendarId: "primary",
    });
  });

  it("redirects with callback_failed on unexpected exceptions", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("oauth offline"));

    const response = await GET(
      new NextRequest("https://earlymark.ai/api/auth/google-calendar/callback?code=abc&state=ws_1"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://earlymark.ai/crm/settings/integrations?error=callback_failed",
    );
  });
});
