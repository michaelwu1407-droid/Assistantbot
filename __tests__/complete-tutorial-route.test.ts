import { beforeEach, describe, expect, it, vi } from "vitest";

const { completeTutorial } = vi.hoisted(() => ({
  completeTutorial: vi.fn(),
}));

vi.mock("@/actions/workspace-actions", () => ({
  completeTutorial,
}));

import { POST } from "@/app/api/workspace/complete-tutorial/route";

function makeRequest(body: unknown) {
  return new Request("https://www.earlymark.ai/api/workspace/complete-tutorial", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/workspace/complete-tutorial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires a workspaceId", async () => {
    const response = await POST(makeRequest({}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "workspaceId is required",
    });
  });

  it("marks the tutorial complete for the workspace", async () => {
    completeTutorial.mockResolvedValue(undefined);

    const response = await POST(makeRequest({ workspaceId: "ws_1" }));

    expect(completeTutorial).toHaveBeenCalledWith("ws_1");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
  });

  it("returns a 500 when the action throws", async () => {
    completeTutorial.mockRejectedValue(new Error("db offline"));

    const response = await POST(makeRequest({ workspaceId: "ws_1" }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Failed to complete tutorial",
    });
  });
});
