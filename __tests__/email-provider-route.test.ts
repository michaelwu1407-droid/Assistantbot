import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  db: {
    user: {
      findFirst: vi.fn(),
    },
  },
  getAuthUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: hoisted.db,
}));

vi.mock("@/lib/auth", () => ({
  getAuthUser: hoisted.getAuthUser,
}));

import { GET } from "@/app/api/auth/email-provider/route";

describe("GET /api/auth/email-provider", () => {
  const originalEnv = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    OUTLOOK_CLIENT_ID: process.env.OUTLOOK_CLIENT_ID,
    OUTLOOK_CLIENT_SECRET: process.env.OUTLOOK_CLIENT_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = "google-client";
    process.env.GOOGLE_CLIENT_SECRET = "google-secret";
    process.env.OUTLOOK_CLIENT_ID = "outlook-client";
    process.env.OUTLOOK_CLIENT_SECRET = "outlook-secret";
    process.env.NEXT_PUBLIC_APP_URL = "https://earlymark.ai";

    hoisted.getAuthUser.mockResolvedValue({ email: "miguel@example.com" });
    hoisted.db.user.findFirst.mockResolvedValue({ id: "user_1", workspaceId: "ws_1" });
  });

  afterAll(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("rejects invalid providers", async () => {
    const response = await GET(
      new NextRequest("https://earlymark.ai/api/auth/email-provider?provider=nope"),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid provider" });
  });

  it("requires an authenticated user", async () => {
    hoisted.getAuthUser.mockResolvedValue(null);

    const response = await GET(
      new NextRequest("https://earlymark.ai/api/auth/email-provider?provider=gmail"),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 404 when the auth user is not in the database", async () => {
    hoisted.db.user.findFirst.mockResolvedValue(null);

    const response = await GET(
      new NextRequest("https://earlymark.ai/api/auth/email-provider?provider=gmail"),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "User not found" });
  });

  it("returns 503 when provider configuration is missing", async () => {
    delete process.env.OUTLOOK_CLIENT_SECRET;

    const response = await GET(
      new NextRequest("https://earlymark.ai/api/auth/email-provider?provider=outlook"),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Outlook integration is not configured",
    });
  });

  it("returns a Gmail OAuth URL for configured users", async () => {
    const response = await GET(
      new NextRequest("https://earlymark.ai/api/auth/email-provider?provider=gmail"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.authUrl).toContain("https://accounts.google.com/o/oauth2/v2/auth?");
    expect(body.authUrl).toContain("client_id=google-client");
    expect(body.authUrl).toContain("state=%7B%22userId%22%3A%22user_1%22%2C%22provider%22%3A%22gmail%22%7D");
  });
});
