import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  getAuthUser: vi.fn(),
  requireDealInCurrentWorkspace: vi.fn(),
  requireContactInCurrentWorkspace: vi.fn(),
  updateJobStatus: vi.fn(),
  createQuoteVariation: vi.fn(),
  logActivity: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAuthUser: hoisted.getAuthUser,
}));

vi.mock("@/lib/workspace-access", () => ({
  requireDealInCurrentWorkspace: hoisted.requireDealInCurrentWorkspace,
  requireContactInCurrentWorkspace: hoisted.requireContactInCurrentWorkspace,
}));

vi.mock("@/actions/tradie-actions", () => ({
  updateJobStatus: hoisted.updateJobStatus,
  createQuoteVariation: hoisted.createQuoteVariation,
}));

vi.mock("@/actions/activity-actions", () => ({
  logActivity: hoisted.logActivity,
}));

import { POST } from "@/app/api/sync/replay/route";

function jsonRequest(body: unknown): Request {
  return new Request("https://earlymark.ai/api/sync/replay", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/sync/replay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.getAuthUser.mockResolvedValue({ id: "user_1", email: "a@b.com" });
    hoisted.requireDealInCurrentWorkspace.mockResolvedValue({
      actor: { id: "user_1", workspaceId: "ws_1", role: "OWNER" },
      deal: { id: "deal_1", workspaceId: "ws_1" },
    });
    hoisted.requireContactInCurrentWorkspace.mockResolvedValue({
      actor: { id: "user_1", workspaceId: "ws_1", role: "OWNER" },
      contact: { id: "contact_1", workspaceId: "ws_1" },
    });
    hoisted.updateJobStatus.mockResolvedValue({ success: true });
    hoisted.createQuoteVariation.mockResolvedValue({ success: true, total: 50 });
    hoisted.logActivity.mockResolvedValue({ success: true, activityId: "act_1" });
  });

  it("rejects unauthenticated callers with 401 and runs nothing", async () => {
    hoisted.getAuthUser.mockResolvedValue(null);

    const res = await POST(jsonRequest({ actionName: "updateJobStatus", payload: { jobId: "deal_x", status: "COMPLETED" } }));

    expect(res.status).toBe(401);
    expect(hoisted.updateJobStatus).not.toHaveBeenCalled();
    expect(hoisted.createQuoteVariation).not.toHaveBeenCalled();
    expect(hoisted.logActivity).not.toHaveBeenCalled();
  });

  it("forwards updateJobStatus only after auth passes", async () => {
    const res = await POST(jsonRequest({ actionName: "updateJobStatus", payload: { jobId: "deal_1", status: "COMPLETED" } }));

    expect(res.status).toBe(200);
    expect(hoisted.updateJobStatus).toHaveBeenCalledWith("deal_1", "COMPLETED");
  });

  it("rejects unknown job statuses with 400 instead of forwarding", async () => {
    const res = await POST(jsonRequest({ actionName: "updateJobStatus", payload: { jobId: "deal_1", status: "BOGUS" } }));

    expect(res.status).toBe(400);
    expect(hoisted.updateJobStatus).not.toHaveBeenCalled();
  });

  it("logActivity is blocked when the dealId belongs to another workspace", async () => {
    hoisted.requireDealInCurrentWorkspace.mockRejectedValue(new Error("Deal not found"));

    const res = await POST(jsonRequest({
      actionName: "logActivity",
      payload: { type: "NOTE", title: "Hi", dealId: "deal_other", content: "" },
    }));

    expect(res.status).toBe(403);
    expect(hoisted.logActivity).not.toHaveBeenCalled();
  });

  it("logActivity is blocked when the contactId belongs to another workspace", async () => {
    hoisted.requireContactInCurrentWorkspace.mockRejectedValue(new Error("Contact not found"));

    const res = await POST(jsonRequest({
      actionName: "logActivity",
      payload: { type: "NOTE", title: "Hi", contactId: "contact_other", content: "" },
    }));

    expect(res.status).toBe(403);
    expect(hoisted.logActivity).not.toHaveBeenCalled();
  });

  it("logActivity requires at least one of dealId/contactId", async () => {
    const res = await POST(jsonRequest({
      actionName: "logActivity",
      payload: { type: "NOTE", title: "Hi", content: "" },
    }));

    expect(res.status).toBe(400);
    expect(hoisted.logActivity).not.toHaveBeenCalled();
  });

  it("logActivity succeeds when ownership checks pass", async () => {
    const res = await POST(jsonRequest({
      actionName: "logActivity",
      payload: { type: "NOTE", title: "Hi", dealId: "deal_1", content: "x" },
    }));

    expect(res.status).toBe(200);
    expect(hoisted.logActivity).toHaveBeenCalledWith({
      type: "NOTE",
      title: "Hi",
      content: "x",
      description: undefined,
      dealId: "deal_1",
      contactId: undefined,
    });
  });

  it("rejects unknown actionName", async () => {
    const res = await POST(jsonRequest({ actionName: "deleteEverything", payload: {} }));
    expect(res.status).toBe(400);
  });
});
