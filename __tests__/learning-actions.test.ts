import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireCurrentWorkspaceAccess, db, revalidatePath } = vi.hoisted(() => ({
  requireCurrentWorkspaceAccess: vi.fn(),
  db: {
    deviationEvent: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    deal: {
      findMany: vi.fn(),
    },
    businessKnowledge: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess,
}));

vi.mock("@/lib/db", () => ({
  db,
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

vi.mock("@/actions/notification-actions", () => ({
  createNotification: vi.fn(),
}));

import { getUnresolvedDeviations, resolveDeviation } from "@/actions/learning-actions";

describe("learning-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "app_user_1",
      role: "OWNER",
      workspaceId: "ws_1",
    });
    db.deviationEvent.findMany.mockResolvedValue([
      {
        id: "dev_1",
        dealId: "deal_1",
        aiRecommendation: "HOLD_REVIEW",
        userAction: "SCHEDULED",
        ruleContent: "Needs review: outside service area",
        resolved: false,
        resolvedAction: null,
        createdAt: new Date("2026-04-01T10:00:00.000Z"),
      },
    ]);
    db.deal.findMany.mockResolvedValue([{ id: "deal_1", title: "Blocked drain" }]);
    db.deviationEvent.findFirst.mockResolvedValue({
      id: "dev_1",
      workspaceId: "ws_1",
      ruleContent: "Needs review: outside service area",
    });
    db.businessKnowledge.findMany.mockResolvedValue([{ id: "rule_1" }]);
    db.deviationEvent.update.mockResolvedValue({});
    db.businessKnowledge.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("loads unresolved deviations from the actor workspace", async () => {
    await expect(getUnresolvedDeviations()).resolves.toEqual([
      expect.objectContaining({
        id: "dev_1",
        dealTitle: "Blocked drain",
      }),
    ]);

    expect(db.deviationEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: "ws_1", resolved: false },
      }),
    );
  });

  it("resolves deviations only inside the actor workspace", async () => {
    await expect(resolveDeviation("dev_1", "REMOVE_RULE")).resolves.toEqual({ success: true });

    expect(db.deviationEvent.findFirst).toHaveBeenCalledWith({
      where: { id: "dev_1", workspaceId: "ws_1" },
    });
    expect(db.deviationEvent.update).toHaveBeenCalledWith({
      where: { id: "dev_1" },
      data: { resolved: true, resolvedAction: "REMOVE_RULE" },
    });
    expect(db.businessKnowledge.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["rule_1"] } },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/crm/settings/knowledge");
  });

  it("does not resolve deviations outside the actor workspace", async () => {
    db.deviationEvent.findFirst.mockResolvedValue(null);

    await expect(resolveDeviation("dev_other", "KEEP_RULE")).resolves.toEqual({
      success: false,
      error: "Deviation not found",
    });
    expect(db.deviationEvent.update).not.toHaveBeenCalled();
  });
});
