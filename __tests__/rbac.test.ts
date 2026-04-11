import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireCurrentWorkspaceAccess } = vi.hoisted(() => ({
  requireCurrentWorkspaceAccess: vi.fn(),
}));

vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess,
}));

import { getCurrentUserRole, isManagerOrAbove } from "@/lib/rbac";

describe("RBAC helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the workspace-aware actor role", async () => {
    requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "user_1",
      workspaceId: "ws_1",
      role: "MANAGER",
    });

    await expect(getCurrentUserRole()).resolves.toBe("MANAGER");
    await expect(isManagerOrAbove()).resolves.toBe(true);
  });

  it("fails closed to team member when workspace access cannot be resolved", async () => {
    requireCurrentWorkspaceAccess.mockRejectedValue(new Error("Workspace access not found"));

    await expect(getCurrentUserRole()).resolves.toBe("TEAM_MEMBER");
    await expect(isManagerOrAbove()).resolves.toBe(false);
  });
});
