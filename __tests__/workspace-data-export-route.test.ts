import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  requireCurrentWorkspaceAccess: vi.fn(),
  db: {
    contact: { findMany: vi.fn() },
    deal: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess: hoisted.requireCurrentWorkspaceAccess,
}));
vi.mock("@/lib/db", () => ({ db: hoisted.db }));

import { GET } from "@/app/api/export/workspace-data/route";

describe("GET /api/export/workspace-data (bill-12 / cpl-06)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "user_1",
      workspaceId: "ws_1",
      role: "OWNER",
    });
    hoisted.db.contact.findMany.mockResolvedValue([
      {
        id: "c_1",
        name: "Alice",
        email: "alice@example.com",
        phone: "0400000001",
        company: "ACME",
        address: "1 Main St",
        createdAt: new Date("2024-01-01T00:00:00Z"),
      },
    ]);
    hoisted.db.deal.findMany.mockResolvedValue([
      {
        id: "d_1",
        title: "Blocked Drain",
        stage: "SCHEDULED",
        value: 250,
        address: "1 Main St",
        scheduledAt: new Date("2024-02-01T10:00:00Z"),
        createdAt: new Date("2024-01-15T00:00:00Z"),
        contact: { name: "Alice", email: "alice@example.com", phone: "0400000001" },
      },
    ]);
  });

  it("returns 401 when the request is not authenticated", async () => {
    hoisted.requireCurrentWorkspaceAccess.mockRejectedValue(new Error("Unauthorized"));

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(hoisted.db.contact.findMany).not.toHaveBeenCalled();
  });

  it("blocks TEAM_MEMBER from downloading workspace data", async () => {
    hoisted.requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "user_tm",
      workspaceId: "ws_1",
      role: "TEAM_MEMBER",
    });

    const response = await GET();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Only workspace owners can export data",
    });
  });

  it("returns a JSON attachment with contacts and deals scoped to the workspace (bill-12)", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(response.headers.get("Content-Disposition")).toMatch(/attachment; filename="earlymark-export-/);

    const body = await response.json();
    expect(body.workspaceId).toBe("ws_1");
    expect(body.exportedAt).toBeTruthy();
    expect(body.contacts).toHaveLength(1);
    expect(body.contacts[0]).toMatchObject({
      id: "c_1",
      name: "Alice",
      email: "alice@example.com",
      phone: "0400000001",
    });
    expect(body.deals).toHaveLength(1);
    expect(body.deals[0]).toMatchObject({
      id: "d_1",
      title: "Blocked Drain",
      stage: "SCHEDULED",
      value: 250,
    });
  });

  it("queries contacts and deals scoped to the actor's workspace, not a request param", async () => {
    await GET();

    expect(hoisted.db.contact.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: "ws_1" } }),
    );
    expect(hoisted.db.deal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: "ws_1", stage: { not: "DELETED" } },
      }),
    );
  });
});
