import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, getAuthUserId, getOrCreateWorkspace } = vi.hoisted(() => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
  },
  getAuthUserId: vi.fn(),
  getOrCreateWorkspace: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/auth", () => ({ getAuthUserId }));
vi.mock("@/actions/workspace-actions", () => ({ getOrCreateWorkspace }));

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
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns the workspace and persisted user role", async () => {
    getAuthUserId.mockResolvedValue("user_123");
    getOrCreateWorkspace.mockResolvedValue({ id: "ws_123", name: "Workspace" });
    db.user.findUnique.mockResolvedValue({ role: "MANAGER" });

    const { getDashboardShellState } = await import("@/lib/dashboard-shell");

    await expect(getDashboardShellState()).resolves.toEqual({
      userId: "user_123",
      workspace: { id: "ws_123", name: "Workspace" },
      userRole: "MANAGER",
    });
  });

  it("falls back to OWNER when the role lookup fails", async () => {
    getAuthUserId.mockResolvedValue("user_123");
    getOrCreateWorkspace.mockResolvedValue({ id: "ws_123" });
    db.user.findUnique.mockRejectedValue(new Error("db unavailable"));

    const { getDashboardShellState } = await import("@/lib/dashboard-shell");

    await expect(getDashboardShellState()).resolves.toEqual({
      userId: "user_123",
      workspace: { id: "ws_123" },
      userRole: "OWNER",
    });
  });
});
