import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  getAuthUserId: vi.fn(),
  getOrCreateWorkspace: vi.fn(),
  getWorkspace: vi.fn(),
  updateWorkspace: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAuthUserId: hoisted.getAuthUserId,
}));

vi.mock("@/actions/workspace-actions", () => ({
  getOrCreateWorkspace: hoisted.getOrCreateWorkspace,
  getWorkspace: hoisted.getWorkspace,
  updateWorkspace: hoisted.updateWorkspace,
}));

import { GET, POST } from "@/app/api/workspace/route";

describe("/api/workspace route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.getAuthUserId.mockResolvedValue("user_1");
    hoisted.getOrCreateWorkspace.mockResolvedValue({
      id: "ws_1",
      name: "Initial Workspace",
    });
    hoisted.getWorkspace.mockResolvedValue({
      id: "ws_1",
      name: "Updated Workspace",
    });
    hoisted.updateWorkspace.mockResolvedValue({ success: true });
  });

  it("GET returns the current user's workspace", async () => {
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(hoisted.getOrCreateWorkspace).toHaveBeenCalledWith("user_1");
    expect(payload).toEqual({
      id: "ws_1",
      name: "Initial Workspace",
    });
  });

  it("POST updates the current user's workspace instead of returning a placeholder 501", async () => {
    const response = await POST(
      new Request("https://app.example.com/api/workspace", {
        method: "POST",
        body: JSON.stringify({
          name: "Updated Workspace",
          location: "Sydney",
        }),
        headers: {
          "content-type": "application/json",
        },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(hoisted.updateWorkspace).toHaveBeenCalledWith("ws_1", {
      name: "Updated Workspace",
      location: "Sydney",
    });
    expect(payload).toEqual({
      success: true,
      workspace: {
        id: "ws_1",
        name: "Updated Workspace",
      },
    });
  });
});
