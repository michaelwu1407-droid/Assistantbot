import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, getAuthUser, getAuthUserId, getOrCreateWorkspace, ensureWorkspaceUserForAuth, revalidatePath } = vi.hoisted(() => ({
  db: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    businessKnowledge: {
      create: vi.fn(),
    },
    businessProfile: {
      update: vi.fn(),
      upsert: vi.fn(),
    },
  },
  getAuthUser: vi.fn(),
  getAuthUserId: vi.fn(),
  getOrCreateWorkspace: vi.fn(),
  ensureWorkspaceUserForAuth: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/auth", () => ({
  getAuthUser,
  getAuthUserId,
}));
vi.mock("@/actions/workspace-actions", () => ({
  getOrCreateWorkspace,
  ensureWorkspaceUserForAuth,
}));
vi.mock("next/cache", () => ({
  revalidatePath,
}));

import { addKnowledgeRule, updateServiceArea } from "@/actions/knowledge-actions";

describe("knowledge-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthUserId.mockResolvedValue("user_1");
    getAuthUser.mockResolvedValue({ id: "user_1", name: "Alex", email: "alex@example.com" });
    getOrCreateWorkspace.mockResolvedValue({ id: "ws_1" });
    ensureWorkspaceUserForAuth.mockResolvedValue({ id: "user_1", email: "alex@example.com", workspaceId: "ws_1" });
    db.user.findUnique.mockResolvedValue({ workspaceId: "ws_1" });
    db.user.findFirst.mockResolvedValue({ id: "user_1" });
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
  });

  it("revalidates both settings paths after updating service area", async () => {
    await expect(updateServiceArea(25, ["Parramatta"])).resolves.toEqual({ success: true });

    expect(revalidatePath).toHaveBeenCalledWith("/crm/settings/knowledge");
    expect(revalidatePath).toHaveBeenCalledWith("/crm/settings/my-business");
  });
});
