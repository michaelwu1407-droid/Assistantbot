import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, requireCurrentWorkspaceAccess, revalidatePath } = vi.hoisted(() => ({
  db: {
    businessKnowledge: {
      create: vi.fn(),
    },
    businessProfile: {
      update: vi.fn(),
      upsert: vi.fn(),
    },
  },
  requireCurrentWorkspaceAccess: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/workspace-access", () => ({ requireCurrentWorkspaceAccess }));
vi.mock("next/cache", () => ({
  revalidatePath,
}));

import { addKnowledgeRule, updateServiceArea } from "@/actions/knowledge-actions";

describe("knowledge-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "app_user_1",
      role: "OWNER",
      workspaceId: "ws_1",
    });
    db.businessKnowledge.create.mockResolvedValue({ id: "rule_1" });
    db.businessProfile.update.mockResolvedValue({});
    db.businessProfile.upsert.mockResolvedValue({});
  });

  it("revalidates both the legacy and canonical settings pages after adding knowledge", async () => {
    await expect(addKnowledgeRule("SERVICE", "Drain cleaning")).resolves.toEqual({
      success: true,
      id: "rule_1",
    });

    expect(revalidatePath).toHaveBeenCalledWith("/crm/settings/knowledge");
    expect(revalidatePath).toHaveBeenCalledWith("/crm/settings/my-business");
    expect(db.businessKnowledge.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ workspaceId: "ws_1" }),
    });
  });

  it("revalidates both settings paths after updating service area", async () => {
    await expect(updateServiceArea(25, ["Parramatta"])).resolves.toEqual({ success: true });

    expect(db.businessProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "app_user_1" },
      }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/crm/settings/knowledge");
    expect(revalidatePath).toHaveBeenCalledWith("/crm/settings/my-business");
  });
});
