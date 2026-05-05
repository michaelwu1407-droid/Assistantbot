import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  requireCurrentWorkspaceAccess: vi.fn(),
  db: {
    activityLog: {
      findMany: vi.fn(),
    },
  },
  logger: {
    error: vi.fn(),
  },
}));

vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess: hoisted.requireCurrentWorkspaceAccess,
}));

vi.mock("@/lib/db", () => ({
  db: hoisted.db,
}));

vi.mock("@/lib/logging", () => ({
  logger: hoisted.logger,
}));

import { GET } from "@/app/api/activity/route";

describe("GET /api/activity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "user_1",
      workspaceId: "ws_1",
      role: "OWNER",
    });
    hoisted.db.activityLog.findMany.mockResolvedValue([
      { id: "log_1", workspaceId: "ws_1", title: "Lead created" },
    ]);
  });

  it("returns recent activity for the current workspace with a capped limit", async () => {
    const response = await GET(
      new NextRequest("https://earlymark.ai/api/activity?workspaceId=ws_1&limit=999"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([{ id: "log_1", workspaceId: "ws_1", title: "Lead created" }]);
    expect(hoisted.db.activityLog.findMany).toHaveBeenCalledWith({
      where: { workspaceId: "ws_1" },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  });

  it("rejects access to a different workspace id", async () => {
    const response = await GET(
      new NextRequest("https://earlymark.ai/api/activity?workspaceId=ws_2"),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden workspace access" });
    expect(hoisted.db.activityLog.findMany).not.toHaveBeenCalled();
  });

  it("returns 401 when workspace access is unauthorized", async () => {
    hoisted.requireCurrentWorkspaceAccess.mockRejectedValue(new Error("Unauthorized"));

    const response = await GET(new NextRequest("https://earlymark.ai/api/activity"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns 500 and logs unexpected failures", async () => {
    hoisted.db.activityLog.findMany.mockRejectedValue(new Error("db offline"));

    const response = await GET(new NextRequest("https://earlymark.ai/api/activity"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Failed to fetch activity logs" });
    expect(hoisted.logger.error).toHaveBeenCalledWith(
      "Failed to fetch activity logs",
      { component: "api/activity", action: "GET" },
      expect.any(Error),
    );
  });
});
