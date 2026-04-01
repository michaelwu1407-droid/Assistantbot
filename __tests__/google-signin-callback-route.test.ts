import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

describe("GET /api/auth/google-signin/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  async function loadRoute() {
    return import("@/app/api/auth/google-signin/callback/route");
  }

  it("redirects provider errors back to auth", async () => {
    const { GET } = await loadRoute();

    const response = await GET(
      new NextRequest("https://app.example.com/api/auth/google-signin/callback?error=access_denied"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://app.example.com/auth?error=access_denied");
  });

  it("redirects when the authorization code is missing", async () => {
    const { GET } = await loadRoute();

    const response = await GET(
      new NextRequest("https://app.example.com/api/auth/google-signin/callback"),
    );

    expect(response.headers.get("location")).toBe("https://app.example.com/auth?error=missing_code");
  });

  it("redirects when Google OAuth is not configured", async () => {
    const { GET } = await loadRoute();

    const response = await GET(
      new NextRequest("https://app.example.com/api/auth/google-signin/callback?code=abc123"),
    );

    expect(response.headers.get("location")).toBe("https://app.example.com/auth?error=config");
  });

  it("redirects when token exchange fails", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "google-client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "google-client-secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        text: vi.fn().mockResolvedValue("invalid_grant"),
      }),
    );

    const { GET } = await loadRoute();
    const response = await GET(
      new NextRequest("https://app.example.com/api/auth/google-signin/callback?code=abc123"),
    );

    expect(response.headers.get("location")).toBe("https://app.example.com/auth?error=token_exchange_failed");
  });

  it("redirects when Google does not return an id token", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "google-client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "google-client-secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ access_token: "access-token" }),
      }),
    );

    const { GET } = await loadRoute();
    const response = await GET(
      new NextRequest("https://app.example.com/api/auth/google-signin/callback?code=abc123"),
    );

    expect(response.headers.get("location")).toBe("https://app.example.com/auth?error=no_id_token");
  });

  it("redirects to the fragment handoff page with the tokens", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://assistantbot.example.com");
    vi.stubEnv("GOOGLE_CLIENT_ID", "google-client-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "google-client-secret");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          id_token: "id-token-123",
          access_token: "access-token-456",
        }),
      }),
    );

    const { GET } = await loadRoute();
    const response = await GET(
      new NextRequest(
        "https://assistantbot.example.com/api/auth/google-signin/callback?code=abc123&state=%2Fsetup",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://assistantbot.example.com/auth/google-done#id_token=id-token-123&next=%2Fsetup&access_token=access-token-456",
    );
  });
});
