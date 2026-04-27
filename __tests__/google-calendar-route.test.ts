import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  getAuthUserId: vi.fn(),
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
  buildGoogleCalendarAuthUrl: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAuthUserId: hoisted.getAuthUserId,
}));

vi.mock("@/lib/db", () => ({
  db: hoisted.db,
}));

vi.mock("@/lib/workspace-calendar", () => ({
  buildGoogleCalendarAuthUrl: hoisted.buildGoogleCalendarAuthUrl,
}));

import { GET } from "@/app/api/auth/google-calendar/route";

describe("GET /api/auth/google-calendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.getAuthUserId.mockResolvedValue("user_1");
    hoisted.db.user.findUnique.mockResolvedValue({ workspaceId: "ws_1" });
    hoisted.buildGoogleCalendarAuthUrl.mockReturnValue("https://accounts.google.com/o/oauth2/auth?state=ws_1");
  });

  it("returns unauthorized when there is no signed-in user", async () => {
    hoisted.getAuthUserId.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 404 when the user has no workspace", async () => {
    hoisted.db.user.findUnique.mockResolvedValue({ workspaceId: null });

    const response = await GET();

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Workspace not found" });
  });

  it("returns the Google Calendar auth URL for the user's workspace", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      authUrl: "https://accounts.google.com/o/oauth2/auth?state=ws_1",
    });
    expect(hoisted.buildGoogleCalendarAuthUrl).toHaveBeenCalledWith("ws_1");
  });
});
