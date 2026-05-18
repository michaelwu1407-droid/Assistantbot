import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  requireCurrentWorkspaceAccess: vi.fn(),
  completeTutorial: vi.fn(),
}));

vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess: hoisted.requireCurrentWorkspaceAccess,
}));

vi.mock("@/actions/workspace-actions", () => ({
  completeTutorial: hoisted.completeTutorial,
}));

import { POST } from "@/app/api/workspace/complete-tutorial/route";

describe("POST /api/workspace/complete-tutorial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "user_1",
      workspaceId: "ws_session",
      role: "OWNER",
    });
    hoisted.completeTutorial.mockResolvedValue(undefined);
  });

  it("rejects unauthenticated callers with 401 and does not run the action", async () => {
    hoisted.requireCurrentWorkspaceAccess.mockRejectedValue(new Error("Unauthorized"));

    const res = await POST();

    expect(res.status).toBe(401);
    expect(hoisted.completeTutorial).not.toHaveBeenCalled();
  });

  it("marks the session workspace tutorial complete, never a body workspaceId", async () => {
    const res = await POST();

    expect(res.status).toBe(200);
    expect(hoisted.completeTutorial).toHaveBeenCalledWith("ws_session");
    expect(hoisted.completeTutorial).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when the action throws", async () => {
    hoisted.completeTutorial.mockRejectedValue(new Error("db offline"));

    const res = await POST();

    expect(res.status).toBe(500);
  });
});
