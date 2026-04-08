import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  requireDealInCurrentWorkspace: vi.fn(),
  requireCurrentWorkspaceAccess: vi.fn(),
  createDeal: vi.fn(),
  loggerError: vi.fn(),
  db: {
    deal: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/workspace-access", () => ({
  requireDealInCurrentWorkspace: hoisted.requireDealInCurrentWorkspace,
  requireCurrentWorkspaceAccess: hoisted.requireCurrentWorkspaceAccess,
}));

vi.mock("@/actions/deal-actions", () => ({
  createDeal: hoisted.createDeal,
}));

vi.mock("@/lib/logging", () => ({
  logger: {
    error: hoisted.loggerError,
  },
}));

vi.mock("@/lib/db", () => ({
  db: hoisted.db,
}));

import { POST } from "@/app/api/deals/route";
import { GET } from "@/app/api/deals/[id]/route";

describe("GET /api/deals/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.requireDealInCurrentWorkspace.mockResolvedValue({
      actor: { id: "user_1", workspaceId: "ws_1", role: "TEAM_MEMBER" },
      deal: { id: "deal_1", workspaceId: "ws_1" },
    });
    hoisted.requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "user_1",
      workspaceId: "ws_1",
      role: "OWNER",
    });
    hoisted.createDeal.mockResolvedValue({
      success: true,
      dealId: "deal_created",
    });
    hoisted.db.deal.findUnique.mockResolvedValue({
      id: "deal_1",
      contactId: "contact_1",
      title: "Blocked Drain",
      assignedToId: "user_1",
      contact: { id: "contact_1", name: "Acme Plumbing" },
      assignedTo: { id: "user_1", name: "Jess" },
      jobPhotos: [],
    });
    hoisted.db.deal.findMany.mockResolvedValue([]);
  });

  it("scopes related customer jobs to the tradie's own assigned jobs", async () => {
    const response = await GET(new Request("https://app.example.com/api/deals/deal_1"), {
      params: Promise.resolve({ id: "deal_1" }),
    });

    expect(response.status).toBe(200);
    expect(hoisted.db.deal.findMany).toHaveBeenCalledWith({
      where: {
        contactId: "contact_1",
        workspaceId: "ws_1",
        id: { not: "deal_1" },
        assignedToId: "user_1",
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
      include: { contact: true },
    });
  });

  it("POST /api/deals creates deals through the real action instead of returning a placeholder 501", async () => {
    const request = new Request("https://app.example.com/api/deals", {
      method: "POST",
      body: JSON.stringify({
        title: "Blocked Drain",
        contactId: "contact_1",
        stage: "new_request",
        workspaceId: "spoofed_ws",
      }),
      headers: {
        "content-type": "application/json",
      },
    });

    const response = await POST(request as Request & { nextUrl?: URL });
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(hoisted.createDeal).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Blocked Drain",
        contactId: "contact_1",
        workspaceId: "ws_1",
      })
    );
    expect(payload).toEqual({
      success: true,
      dealId: "deal_created",
    });
  });
});
