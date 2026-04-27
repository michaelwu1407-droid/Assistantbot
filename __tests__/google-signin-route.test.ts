import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { GET } from "@/app/api/auth/google-signin/route";

const originalClientId = process.env.GOOGLE_CLIENT_ID;
const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

describe("GET /api/auth/google-signin", () => {
  afterEach(() => {
    if (originalClientId === undefined) {
      delete process.env.GOOGLE_CLIENT_ID;
    } else {
      process.env.GOOGLE_CLIENT_ID = originalClientId;
    }

    if (originalAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    }
  });

  it("redirects to auth with config error when GOOGLE_CLIENT_ID is missing", async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    process.env.NEXT_PUBLIC_APP_URL = "https://earlymark.ai";

    const response = await GET(
      new NextRequest("https://earlymark.ai/api/auth/google-signin"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://earlymark.ai/auth?error=config");
  });

  it("redirects to Google's OAuth screen using the configured callback", async () => {
    process.env.GOOGLE_CLIENT_ID = "google_client_id";
    process.env.NEXT_PUBLIC_APP_URL = "https://earlymark.ai";

    const response = await GET(
      new NextRequest("https://earlymark.ai/api/auth/google-signin?next=%2Fcrm"),
    );

    const location = response.headers.get("location");

    expect(response.status).toBe(307);
    expect(location).toContain("https://accounts.google.com/o/oauth2/v2/auth?");
    expect(location).toContain("client_id=google_client_id");
    expect(location).toContain(
      encodeURIComponent("https://earlymark.ai/api/auth/google-signin/callback"),
    );
    expect(location).toContain("state=%2Fcrm");
    expect(location).toContain("scope=openid+email+profile");
  });
});
