import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getAuthUser, db } = vi.hoisted(() => ({
  getAuthUser: vi.fn(),
  db: {
    user: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  getAuthUser,
}));

vi.mock("@/lib/db", () => ({
  db,
}));

import { GET } from "@/app/api/auth/email-provider/route";

describe("email provider auth route", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    getAuthUser.mockResolvedValue({ email: "owner@earlymark.ai" });
    db.user.findFirst.mockResolvedValue({ id: "user_1", workspaceId: "ws_1" });
  });

  it("returns a clear 503 when Outlook OAuth is not configured", async () => {
    delete process.env.OUTLOOK_CLIENT_ID;
    delete process.env.OUTLOOK_CLIENT_SECRET;
    process.env.NEXT_PUBLIC_APP_URL = "https://www.earlymark.ai";

    const response = await GET(
      new NextRequest("https://www.earlymark.ai/api/auth/email-provider?provider=outlook"),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Outlook integration is not configured",
    });
  });

  it("does not leak an undefined client id into a Gmail auth URL", async () => {
    process.env.GOOGLE_CLIENT_ID = "google-client";
    process.env.GOOGLE_CLIENT_SECRET = "google-secret";
    process.env.NEXT_PUBLIC_APP_URL = "https://www.earlymark.ai";

    const response = await GET(
      new NextRequest("https://www.earlymark.ai/api/auth/email-provider?provider=gmail"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.authUrl).toContain("client_id=google-client");
    expect(payload.authUrl).not.toContain("client_id=undefined");
    expect(payload.authUrl).toContain(encodeURIComponent("https://www.earlymark.ai/api/auth/gmail/callback"));
  });
});
