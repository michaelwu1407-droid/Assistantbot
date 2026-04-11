import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAuthUserId, getOrCreateWorkspace, requireCurrentWorkspaceAccess } = vi.hoisted(() => ({
  getAuthUserId: vi.fn(),
  getOrCreateWorkspace: vi.fn(),
  requireCurrentWorkspaceAccess: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getAuthUserId }));
vi.mock("@/actions/workspace-actions", () => ({ getOrCreateWorkspace }));
vi.mock("@/lib/workspace-access", () => ({ requireCurrentWorkspaceAccess }));

describe("lib/dashboard-shell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns null for unauthenticated users", async () => {
    getAuthUserId.mockResolvedValue(null);

    const { getDashboardShellState } = await import("@/lib/dashboard-shell");

    await expect(getDashboardShellState()).resolves.toBeNull();
    expect(getOrCreateWorkspace).not.toHaveBeenCalled();
    expect(requireCurrentWorkspaceAccess).not.toHaveBeenCalled();
  });

  it("returns the workspace and workspace-aware app user role", async () => {
    getAuthUserId.mockResolvedValue("auth_user_123");
    getOrCreateWorkspace.mockResolvedValue({ id: "ws_123", name: "Workspace" });
    requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "app_user_123",
      workspaceId: "ws_123",
      role: "MANAGER",
    });

    const { getDashboardShellState } = await import("@/lib/dashboard-shell");

    await expect(getDashboardShellState()).resolves.toEqual({
      userId: "app_user_123",
      workspace: { id: "ws_123", name: "Workspace" },
      userRole: "MANAGER",
    });
  });

  it("fails closed to team member when workspace actor lookup fails", async () => {
    getAuthUserId.mockResolvedValue("user_123");
    getOrCreateWorkspace.mockResolvedValue({ id: "ws_123" });
    requireCurrentWorkspaceAccess.mockRejectedValue(new Error("db unavailable"));

    const { getDashboardShellState } = await import("@/lib/dashboard-shell");

    await expect(getDashboardShellState()).resolves.toEqual({
      userId: "user_123",
      workspace: { id: "ws_123" },
      userRole: "TEAM_MEMBER",
    });
  });
});
